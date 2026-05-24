import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  AnalyzeStreetViewBody,
  GeocodeAddressQueryParams,
  NearbyPlacesQueryParams,
} from "@workspace/api-zod";

const router = Router();

type GooglePlace = {
  place_id: string;
  name: string;
  types?: string[];
  geometry?: { location: { lat: number; lng: number } };
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  icon_background_color?: string;
};

async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radius: number,
  apiKey: string,
): Promise<GooglePlace[]> {
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}&radius=${radius}&key=${apiKey}`;
  const r = await fetch(url);
  const data = (await r.json()) as { status: string; results?: GooglePlace[] };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return [];
  }
  return data.results ?? [];
}

router.post("/streetview/analyze", async (req, res) => {
  const parsed = AnalyzeStreetViewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const {
    lat,
    lng,
    heading = 0,
    pitch = 0,
    imageUrl: providedImageUrl,
    compareWithStreetView = false,
  } = parsed.data;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "Configuration error", message: "Google Maps API key not configured" });
    return;
  }

  try {
    const primaryImageUrl =
      providedImageUrl ||
      `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&key=${apiKey}`;

    const isCameraImage = primaryImageUrl.startsWith("data:");
    const shouldCompare = isCameraImage && compareWithStreetView;

    const referenceStreetViewUrl = shouldCompare
      ? `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&fov=90&key=${apiKey}`
      : null;

    const [geocodeRes, nearbyPlacesRaw] = await Promise.all([
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`),
      isCameraImage
        ? fetchNearbyPlaces(lat, lng, 150, apiKey)
        : Promise.resolve([] as GooglePlace[]),
    ]);

    const geocodeData = (await geocodeRes.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        address_components: Array<{ long_name: string; types: string[] }>;
      }>;
    };

    let formattedAddress = `${lat}, ${lng}`;
    let neighborhood = "";
    let city = "";
    let country = "";

    if (geocodeData.status === "OK" && geocodeData.results.length > 0) {
      const result = geocodeData.results[0];
      formattedAddress = result.formatted_address;
      for (const comp of result.address_components) {
        if (comp.types.includes("neighborhood") || comp.types.includes("sublocality")) {
          neighborhood = comp.long_name;
        }
        if (comp.types.includes("locality") || comp.types.includes("administrative_area_level_3")) {
          city = comp.long_name;
        }
        if (comp.types.includes("country")) {
          country = comp.long_name;
        }
      }
    }

    const nearbyPlacesList = nearbyPlacesRaw
      .filter((p) => p.name)
      .slice(0, 20)
      .map((p) => {
        const types = (p.types ?? []).filter((t) => t !== "point_of_interest" && t !== "establishment").slice(0, 3);
        return `- ${p.name}${types.length ? ` (${types.join(", ")})` : ""}${p.vicinity ? ` — ${p.vicinity}` : ""}`;
      })
      .join("\n");

    const systemPrompt = `You are an expert urban environment analyst with deep knowledge of architecture, city planning, and geography.
Analyze images of real-world environments and provide detailed, accurate descriptions.
Respond ONLY with valid JSON in Italian. Do not include markdown code blocks.`;

    const sourceDescription = shouldCompare
      ? `TWO images: (1) a live photo taken with a phone camera, and (2) a Google Street View reference image, both at coordinates (${lat}, ${lng})`
      : isCameraImage
        ? `a live photo taken with a phone camera at coordinates (${lat}, ${lng})`
        : `a Google Street View image from coordinates (${lat}, ${lng})`;

    const recognitionInstructions = isCameraImage
      ? `

You will also try to RECOGNIZE the specific place visible in the camera photo. ${
          shouldCompare
            ? "Use the Street View reference image as visual ground truth to confirm the user is actually at this location and to identify visible buildings."
            : ""
        } Use this list of nearby points of interest from Google Places (within ~150m) to find the best match:
${nearbyPlacesList || "(no nearby places returned)"}

Add a "recognition" object to your JSON with:
{
  "recognized": boolean (true only if you are reasonably confident),
  "placeName": "name of the recognized place or building",
  "confidence": "low | medium | high",
  "matchReasoning": "1 short sentence in Italian explaining the match",
  "matchedNearbyPlace": "exact name from the nearby list if it matches, otherwise omit"
}`
      : "";

    const userPrompt = `Analyze ${sourceDescription}${formattedAddress ? ` - ${formattedAddress}` : ""}.
Provide a detailed analysis in the following JSON format (all text in Italian):
{
  "summary": "A 2-3 sentence overall description of what you see",
  "areaType": "One of: residential, commercial, industrial, mixed-use, historic, natural, rural, suburban, tourist",
  "landmarks": ["List of notable buildings, monuments, or recognizable structures visible"],
  "businesses": ["List of visible shops, restaurants, or commercial establishments"],
  "infrastructure": ["List of road types, transport infrastructure, signage, utilities visible"],
  "atmosphere": "Description of the general mood, time of day feel, condition of the environment",
  "safetyNote": "Optional observation about pedestrian accessibility, road safety, or notable conditions"${
    isCameraImage
      ? `,
  "recognition": { ... see below ... }`
      : ""
  }
}${recognitionInstructions}`;

    const userContent: Array<
      { type: "image_url"; image_url: { url: string; detail: "high" } } | { type: "text"; text: string }
    > = [
      { type: "image_url", image_url: { url: primaryImageUrl, detail: "high" } },
    ];
    if (referenceStreetViewUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: referenceStreetViewUrl, detail: "high" },
      });
    }
    userContent.push({ type: "text", text: userPrompt });

    if (!openai) {
      res.status(503).json({ error: "AI non configurata", message: "Imposta OPENAI_API_KEY nel file .env per usare l'analisi AI." });
      return;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    let parsedJson: Record<string, unknown>;
    try {
      parsedJson = JSON.parse(content) as Record<string, unknown>;
    } catch {
      parsedJson = {
        summary: content,
        areaType: "unknown",
        landmarks: [],
        businesses: [],
        infrastructure: [],
        atmosphere: "",
      };
    }

    const { recognition: rawRecognition, ...environment } = parsedJson as {
      recognition?: Record<string, unknown>;
      [k: string]: unknown;
    };

    const recognition =
      isCameraImage && rawRecognition
        ? {
            recognized: Boolean(rawRecognition.recognized),
            placeName: typeof rawRecognition.placeName === "string" ? rawRecognition.placeName : undefined,
            confidence: typeof rawRecognition.confidence === "string" ? rawRecognition.confidence : undefined,
            matchReasoning:
              typeof rawRecognition.matchReasoning === "string" ? rawRecognition.matchReasoning : undefined,
            matchedNearbyPlace:
              typeof rawRecognition.matchedNearbyPlace === "string" ? rawRecognition.matchedNearbyPlace : undefined,
          }
        : undefined;

    res.json({
      location: {
        lat,
        lng,
        formattedAddress,
        neighborhood,
        city,
        country,
      },
      environment,
      streetViewImageUrl: isCameraImage ? referenceStreetViewUrl ?? "" : primaryImageUrl,
      ...(recognition ? { recognition } : {}),
    });
  } catch (error) {
    req.log.error({ error }, "Error analyzing street view");
    res.status(500).json({ error: "Analysis failed", message: String(error) });
  }
});

router.get("/streetview/places", async (req, res) => {
  const parsed = NearbyPlacesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Configuration error", message: "Google Maps API key not configured" });
    return;
  }

  try {
    const { lat, lng, radius } = parsed.data;
    const raw = await fetchNearbyPlaces(lat, lng, radius, apiKey);
    const places = raw
      .filter((p) => p.geometry?.location && p.name)
      .map((p) => ({
        placeId: p.place_id,
        name: p.name,
        types: p.types ?? [],
        lat: p.geometry!.location.lat,
        lng: p.geometry!.location.lng,
        vicinity: p.vicinity,
        rating: p.rating,
        userRatingsTotal: p.user_ratings_total,
        iconBgColor: p.icon_background_color,
      }));
    res.json({ places });
  } catch (error) {
    req.log.error({ error }, "Error fetching nearby places");
    res.status(500).json({ error: "Places fetch failed", message: String(error) });
  }
});

router.get("/streetview/place-details", async (req, res) => {
  const placeId = req.query.placeId as string | undefined;
  if (!placeId) {
    res.status(400).json({ error: "Bad request", message: "placeId required" });
    return;
  }
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Configuration error", message: "Google Maps API key not configured" });
    return;
  }

  try {
    const fields = [
      "name",
      "formatted_address",
      "rating",
      "user_ratings_total",
      "opening_hours",
      "editorial_summary",
      "website",
      "formatted_phone_number",
      "price_level",
      "types",
      "icon_background_color",
    ].join(",");
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=it&key=${apiKey}`;
    const r = await fetch(url);
    const data = (await r.json()) as {
      status: string;
      result?: {
        name?: string;
        formatted_address?: string;
        rating?: number;
        user_ratings_total?: number;
        opening_hours?: { open_now?: boolean; weekday_text?: string[] };
        editorial_summary?: { overview?: string };
        website?: string;
        formatted_phone_number?: string;
        price_level?: number;
        types?: string[];
        icon_background_color?: string;
      };
    };

    if (data.status !== "OK" || !data.result) {
      res.status(404).json({ error: "Not found", message: "Place not found" });
      return;
    }

    const r2 = data.result;
    res.json({
      name: r2.name,
      formattedAddress: r2.formatted_address,
      rating: r2.rating,
      userRatingsTotal: r2.user_ratings_total,
      openNow: r2.opening_hours?.open_now,
      weekdayText: r2.opening_hours?.weekday_text,
      editorialSummary: r2.editorial_summary?.overview,
      website: r2.website,
      phone: r2.formatted_phone_number,
      priceLevel: r2.price_level,
      types: r2.types,
      iconBgColor: r2.icon_background_color,
    });
  } catch (error) {
    req.log.error({ error }, "Error fetching place details");
    res.status(500).json({ error: "Place details fetch failed", message: String(error) });
  }
});

router.get("/streetview/geocode", async (req, res) => {
  const parsed = GeocodeAddressQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request", message: parsed.error.message });
    return;
  }

  const { address } = parsed.data;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "Configuration error", message: "Google Maps API key not configured" });
    return;
  }

  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = (await geocodeRes.json()) as {
      status: string;
      results: Array<{
        geometry: { location: { lat: number; lng: number } };
        formatted_address: string;
        address_components: Array<{ long_name: string; types: string[] }>;
      }>;
    };

    if (geocodeData.status !== "OK" || geocodeData.results.length === 0) {
      res.status(404).json({ error: "Not found", message: "Address not found" });
      return;
    }

    const result = geocodeData.results[0];
    const { lat, lng } = result.geometry.location;
    let city = "";
    let country = "";

    for (const comp of result.address_components) {
      if (comp.types.includes("locality") || comp.types.includes("administrative_area_level_3")) {
        city = comp.long_name;
      }
      if (comp.types.includes("country")) {
        country = comp.long_name;
      }
    }

    res.json({
      lat,
      lng,
      formattedAddress: result.formatted_address,
      city,
      country,
    });
  } catch (error) {
    req.log.error({ error }, "Error geocoding address");
    res.status(500).json({ error: "Geocoding failed", message: String(error) });
  }
});

export default router;
