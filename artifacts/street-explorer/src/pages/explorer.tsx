import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useAnalyzeStreetView, useGeocodeAddress, getGeocodeAddressQueryKey } from "@workspace/api-client-react";
import { useGoogleMapsApi } from "@/hooks/use-google-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, MapPin, Navigation, Compass, Building, Store, ShieldAlert, Trees, Navigation2, Zap, Info, Camera, Eye, EyeOff, X, LogOut, User, ExternalLink, MapPinOff, SlidersHorizontal } from "lucide-react";import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/i18n";
import { LanguageSelector as LanguageSelectorInline } from "@/i18n";
import { useUser, useClerk } from "@clerk/react";
import { useVoiceMode } from "@/hooks/use-voice-mode";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DEFAULT_CENTER = { lat: 40.758896, lng: -73.985130 }; // Times Square

export default function Explorer() {
  const { isLoaded, error, isLoading: isMapsLoading } = useGoogleMapsApi();
  const { toast } = useToast();
  const { t, currentLang: currentLangCode } = useT();
  const { user } = useUser();
  const { signOut } = useClerk();
  const {
    isVoiceMode, toggleVoiceMode, isListening, isSpeaking,
    isSupported: isVoiceSupported, lastTranscript,
    startListening, stopListening, speak, setOnCommand,
  } = useVoiceMode();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const panoRef = useRef<HTMLDivElement>(null);
  
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [panorama, setPanorama] = useState<google.maps.StreetViewPanorama | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const poiMapMarkersRef = useRef<google.maps.Marker[]>([]);
  const poiPanoMarkersRef = useRef<google.maps.Marker[]>([]);
  const poiInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const poiPanoInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const poiFetchTimerRef = useRef<number | null>(null);
  const lastPoiResultsRef = useRef<google.maps.places.PlaceResult[]>([]);
  const [showPois, setShowPois] = useState(true);
  const [poiFilter, setPoiFilter] = useState("");
const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [poiCount, setPoiCount] = useState(0);
  const [showResults, setShowResults] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAddress, setActiveAddress] = useState("");

  const [currentLocation, setCurrentLocation] = useState(DEFAULT_CENTER);
  const [currentPov, setCurrentPov] = useState({ heading: 0, pitch: 0 });

  const [destinationQuery, setDestinationQuery] = useState("");
  const [destination, setDestination] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [isGeocodingDest, setIsGeocodingDest] = useState(false);
  const destLineRef = useRef<google.maps.Polyline | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);

  // Selected POI overlay info (shown on the panorama)
  const [selectedPanoPlace, setSelectedPanoPlace] = useState<{
    name: string;
    address: string;
    type: string;
    emoji: string;
    rating?: number;
    userRatings?: number;
    openNow?: boolean;
    summary?: string;
    website?: string;
    lat?: number;
    lng?: number;
  } | null>(null);
  
  const analyzeMutation = useAnalyzeStreetView();
  const { data: geocodeData, isFetching: isGeocoding } = useGeocodeAddress(
    { address: activeAddress },
    { 
      query: { 
        enabled: !!activeAddress,
        queryKey: getGeocodeAddressQueryKey({ address: activeAddress })
      } 
    }
  );

  useEffect(() => {
    if (geocodeData && map && panorama) {
      const pos = { lat: geocodeData.lat, lng: geocodeData.lng };
      map.setCenter(pos);
      panorama.setPosition(pos);
      if (marker) marker.setPosition(pos);
      setCurrentLocation(pos);
    }
  }, [geocodeData, map, panorama, marker]);

  // Initialize Map and Panorama
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !panoRef.current) return;
    
    if (map && panorama) return; // Already initialized

    const newMap = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 14,
      mapTypeId: "roadmap",
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#263c3f" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b9a76" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#746855" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1f2835" }],
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#f3d19c" }],
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2f3948" }],
        },
        {
          featureType: "transit.station",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#17263c" }],
        },
      ],
    });

    const newPanorama = new window.google.maps.StreetViewPanorama(panoRef.current, {
      position: DEFAULT_CENTER,
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      addressControl: false,
      showRoadLabels: false,
      linksControl: false,
      clickToGo: false,
      panControl: false,
      motionTracking: true,
      motionTrackingControl: true,
    });

    newMap.setStreetView(newPanorama);

    const newMarker = new window.google.maps.Marker({
      position: DEFAULT_CENTER,
      map: newMap,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#00d1b2", // Match primary teal
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });

    // Sync marker with panorama
    newPanorama.addListener("position_changed", () => {
      const pos = newPanorama.getPosition();
      if (pos) {
        newMarker.setPosition(pos);
        newMap.panTo(pos);
        setCurrentLocation({ lat: pos.lat(), lng: pos.lng() });
      }
    });

    newPanorama.addListener("pov_changed", () => {
      const pov = newPanorama.getPov();
      setCurrentPov(pov);
    });

    newMap.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        newPanorama.setPosition(e.latLng);
      }
    });

    poiInfoWindowRef.current = new window.google.maps.InfoWindow();
    poiPanoInfoWindowRef.current = new window.google.maps.InfoWindow();

    setMap(newMap);
    setPanorama(newPanorama);
    setMarker(newMarker);
    
  }, [isLoaded]);

  const clearPoiMarkers = useCallback(() => {
    poiMapMarkersRef.current.forEach((m) => m.setMap(null));
    poiMapMarkersRef.current = [];
    poiPanoMarkersRef.current.forEach((m) => m.setMap(null));
    poiPanoMarkersRef.current = [];
  }, []);

const POI_CATEGORY_GROUPS = [
    { label: "🍽️ Cibo & Bevande", types: ["restaurant", "cafe", "bar", "food", "bakery", "night_club"] },
    { label: "🛍️ Shopping", types: ["store", "shopping_mall", "clothing_store", "supermarket"] },
    { label: "🏨 Alloggi", types: ["lodging", "hotel"] },
    { label: "🏛️ Cultura", types: ["museum", "art_gallery", "tourist_attraction", "church", "place_of_worship"] },
    { label: "🎓 Istruzione", types: ["school", "university"] },
    { label: "⚕️ Salute", types: ["hospital", "doctor", "pharmacy"] },
    { label: "🏦 Finanza", types: ["bank", "atm"] },
    { label: "🚉 Trasporti", types: ["transit_station", "bus_station", "subway_station", "train_station"] },
    { label: "🅿️ Auto", types: ["parking", "gas_station"] },
    { label: "🌳 Verde", types: ["park"] },
  ];

  const friendlyType = (types: string[] = []): string => {
    const map: Record<string, string> = {
      restaurant: t.poi.restaurant,
      cafe: t.poi.cafe,
      bar: t.poi.bar,
      food: t.poi.food,
      bakery: t.poi.bakery,
      lodging: t.poi.hotel,
      hotel: t.poi.hotel,
      store: t.poi.store,
      shopping_mall: t.poi.shopping_mall,
      clothing_store: t.poi.clothing,
      supermarket: t.poi.supermarket,
      museum: t.poi.museum,
      art_gallery: t.poi.art_gallery,
      park: t.poi.park,
      school: t.poi.school,
      university: t.poi.university,
      hospital: t.poi.hospital,
      doctor: t.poi.doctor,
      pharmacy: t.poi.pharmacy,
      bank: t.poi.bank,
      atm: t.poi.atm,
      church: t.poi.church,
      place_of_worship: t.poi.place_of_worship,
      bus_station: t.poi.bus_stop,
      train_station: t.poi.train_station,
      subway_station: t.poi.subway,
      transit_station: t.poi.transport,
      tourist_attraction: t.poi.tourist_attraction,
      gas_station: t.poi.gas_station,
      parking: t.poi.parking,
      gym: t.poi.gym,
      night_club: t.poi.bar,
    };
    for (const type of types) {
      if (map[type]) return map[type];
    }
    return t.poi.point_of_interest;
  };

  const iconForType = useCallback((types: string[] = []): string => {
    if (types.includes("restaurant") || types.includes("cafe") || types.includes("bar") || types.includes("food")) return "🍽️";
    if (types.includes("lodging")) return "🏨";
    if (types.includes("store") || types.includes("shopping_mall") || types.includes("clothing_store")) return "🛍️";
    if (types.includes("museum") || types.includes("art_gallery")) return "🏛️";
    if (types.includes("park")) return "🌳";
    if (types.includes("school") || types.includes("university")) return "🎓";
    if (types.includes("hospital") || types.includes("doctor") || types.includes("pharmacy")) return "⚕️";
    if (types.includes("bank") || types.includes("atm")) return "🏦";
    if (types.includes("church") || types.includes("place_of_worship")) return "⛪";
    if (types.includes("transit_station") || types.includes("bus_station") || types.includes("subway_station") || types.includes("train_station")) return "🚉";
    if (types.includes("parking") || types.includes("gas_station")) return "🅿️";
    if (types.includes("tourist_attraction")) return "📸";
    return "📍";
  }, []);

  const renderPoiMarkers = useCallback(
    (results: google.maps.places.PlaceResult[]) => {
      clearPoiMarkers();
      if (!showPois || !map || !panorama) {
        setPoiCount(0);
        return;
      }
      const filterLower = poiFilter.trim().toLowerCase();
      const filtered = results
        .filter((p) => p.geometry?.location && p.name)
        .filter((p) => {
          if (!filterLower) return true;
          const haystack = [p.name ?? "", ...(p.types ?? []), p.vicinity ?? ""]
            .join(" ")
            .toLowerCase();
          return haystack.includes(filterLower);
        })
        .filter((p) => {
          if (selectedCategories.length === 0) return true;
          const placeTypes = p.types ?? [];
          return selectedCategories.some((cat) => placeTypes.includes(cat));
        })

      setPoiCount(filtered.length);

      filtered.forEach((place) => {
        const emoji = iconForType(place.types);
        // Use Google Maps' official background color for this place type when available
        const bgColor =
          (place as google.maps.places.PlaceResult & { icon_background_color?: string })
            .icon_background_color || "#00d1b2";
        const iconSvg =
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='52' height='66' viewBox='0 0 52 66'>
              <defs><filter id='s' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='2' stdDeviation='2' flood-opacity='0.55'/>
              </filter></defs>
              <path filter='url(#s)' d='M26 0C11.64 0 0 11.64 0 26c0 18 26 40 26 40s26-22 26-40C52 11.64 40.36 0 26 0z' fill='${bgColor}' stroke='#ffffff' stroke-width='2.5'/>
              <circle cx='26' cy='26' r='17' fill='#ffffff'/>
              <text x='26' y='33' font-size='22' text-anchor='middle'>${emoji}</text>
            </svg>`,
          );
        const mapIcon = {
          url: iconSvg,
          scaledSize: new window.google.maps.Size(16, 20),
          anchor: new window.google.maps.Point(8, 20),
        };
        // Much larger icon for the panorama, where markers shrink with perspective
const panoIcon = {
          url: iconSvg,
          scaledSize: new window.google.maps.Size(84, 107),
          anchor: new window.google.maps.Point(42, 107),
        };
        const ratingHtml = place.rating
          ? `<div style="font-size:11px;color:#fbbf24;">★ ${place.rating}</div>`
          : "";
        const popupHtml = `<div style="color:#0b0b0b;font-family:system-ui;padding:2px 4px;max-width:220px;">
           <div style="font-weight:600;margin-bottom:2px;">${emoji} ${place.name ?? ""}</div>
           <div style="font-size:11px;color:#555;">${(place.vicinity ?? "").toString()}</div>
           ${ratingHtml}
         </div>`;

        // Marker on the mini-map
        const mapMarker = new window.google.maps.Marker({
          position: place.geometry!.location!,
          map,
          icon: mapIcon,
          title: place.name,
        });
        mapMarker.addListener("click", () => {
          if (!poiInfoWindowRef.current) return;
          poiInfoWindowRef.current.setContent(popupHtml);
          poiInfoWindowRef.current.open(map, mapMarker);
        });
        poiMapMarkersRef.current.push(mapMarker);

        // Marker on the Street View panorama
        const panoMarker = new window.google.maps.Marker({
          position: place.geometry!.location!,
          map: panorama,
          icon: panoIcon,
          title: place.name,
          clickable: true,
          optimized: false,
          zIndex: 1000,
        });
        panoMarker.addListener("click", () => {
          // Show preliminary info immediately
          setSelectedPanoPlace({
            name: place.name ?? t.explorer.no_name,
            address: place.vicinity ?? "",
            type: friendlyType(place.types),
            emoji,
            rating: place.rating,
            userRatings: place.user_ratings_total,
            lat: place.geometry!.location!.lat(),
            lng: place.geometry!.location!.lng(),
          });
          // Fetch richer details (editorial summary, opening hours, website, etc.)
          if (place.place_id && map) {
            const details = new window.google.maps.places.PlacesService(map);
            details.getDetails(
              {
                placeId: place.place_id,
                fields: [
                  "name",
                  "formatted_address",
                  "rating",
                  "user_ratings_total",
                  "opening_hours",
                  "editorial_summary",
                  "types",
                  "website",
                ],
              },
              (det, status) => {
                if (
                  status !==
                    window.google.maps.places.PlacesServiceStatus.OK ||
                  !det
                )
                  return;
                const d = det as google.maps.places.PlaceResult & {
                  editorial_summary?: { overview?: string };
                };
                setSelectedPanoPlace((prev) =>
                  prev
                    ? {
                        ...prev,
                        name: d.name ?? prev.name,
                        address: d.formatted_address ?? prev.address,
                        rating: d.rating ?? prev.rating,
                        userRatings: d.user_ratings_total ?? prev.userRatings,
                        openNow: d.opening_hours?.isOpen?.(),
                        summary: d.editorial_summary?.overview,
                        website: d.website,
                      }
                    : prev,
                );
              },
            );
          }
        });
        poiPanoMarkersRef.current.push(panoMarker);
      });
}, [showPois, map, panorama, poiFilter, selectedCategories, iconForType, clearPoiMarkers]);

  const fetchPois = useCallback(
    (mapInstance: google.maps.Map, pos: google.maps.LatLng) => {
      if (!window.google?.maps?.places) return;
      const service = new window.google.maps.places.PlacesService(mapInstance);
      service.nearbySearch(
        { location: pos, radius: 200, type: undefined },
        (results, status) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) {
            lastPoiResultsRef.current = [];
            renderPoiMarkers([]);
            return;
          }
          lastPoiResultsRef.current = results;
          renderPoiMarkers(results);
        },
      );
    },
    [renderPoiMarkers],
  );

  // Fetch POIs when location changes (debounced)
  useEffect(() => {
    if (!map || !panorama) return;
    if (poiFetchTimerRef.current) window.clearTimeout(poiFetchTimerRef.current);
    poiFetchTimerRef.current = window.setTimeout(() => {
      const pos = panorama.getPosition();
      if (pos && showPois) fetchPois(map, pos);
    }, 600);
    return () => {
      if (poiFetchTimerRef.current) window.clearTimeout(poiFetchTimerRef.current);
    };
  }, [currentLocation.lat, currentLocation.lng, map, panorama, fetchPois, showPois]);

  // Re-render markers when toggle or filter change (no refetch)
  useEffect(() => {
    if (!showPois) {
      clearPoiMarkers();
      setPoiCount(0);
      return;
    }
    if (lastPoiResultsRef.current.length > 0) {
      renderPoiMarkers(lastPoiResultsRef.current);
    } else if (map && panorama) {
      const pos = panorama.getPosition();
      if (pos) fetchPois(map, pos);
    }
  }, [showPois, poiFilter, renderPoiMarkers, clearPoiMarkers, map, panorama, fetchPois]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveAddress(searchQuery.trim());
    }
  };

  // Bearing in degrees (0=N, 90=E) from point A to point B
  const computeBearing = (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): number => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const dLng = toRad(b.lng - a.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };

  // Great-circle distance in meters
  const computeDistance = (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): number => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const handleSetDestination = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const q = destinationQuery.trim();
      if (!q || !window.google?.maps) return;
      setIsGeocodingDest(true);
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: q }, (results, status) => {
        setIsGeocodingDest(false);
        if (status !== "OK" || !results || results.length === 0) {
          toast({
            title: t.explorer.destination_not_found,
            description: t.explorer.try_specific_address,
            variant: "destructive",
          });
          return;
        }
        const loc = results[0].geometry.location;
        setDestination({
          lat: loc.lat(),
          lng: loc.lng(),
          label: results[0].formatted_address ?? q,
        });
      });
    },
    [destinationQuery, toast],
  );

  const handleSetDestinationFromPOI = useCallback(
    (place: { name: string; lat: number; lng: number }) => {
      setDestination({
        lat: place.lat,
        lng: place.lng,
        label: place.name,
      });
    },
    [],
  );

  const clearDestination = () => {
    setDestination(null);
    setDestinationQuery("");
  };

  // Draw a line + pin on the mini-map between current position and destination
  useEffect(() => {
    if (!map) return;
    if (destLineRef.current) {
      destLineRef.current.setMap(null);
      destLineRef.current = null;
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.setMap(null);
      destMarkerRef.current = null;
    }
    if (!destination) return;
    destLineRef.current = new window.google.maps.Polyline({
      path: [
        { lat: currentLocation.lat, lng: currentLocation.lng },
        { lat: destination.lat, lng: destination.lng },
      ],
      geodesic: true,
      strokeColor: "#00d1b2",
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map,
    });
    destMarkerRef.current = new window.google.maps.Marker({
      position: { lat: destination.lat, lng: destination.lng },
      map,
      title: destination.label,
      icon: {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='44' height='56' viewBox='0 0 44 56'>
              <path d='M22 0C9.85 0 0 9.85 0 22c0 15 22 34 22 34s22-19 22-34C44 9.85 34.15 0 22 0z' fill='#ef4444' stroke='#ffffff' stroke-width='2.5'/>
              <circle cx='22' cy='22' r='9' fill='#ffffff'/>
            </svg>`,
          ),
        scaledSize: new window.google.maps.Size(36, 46),
        anchor: new window.google.maps.Point(18, 46),
      },
    });
    // Fit map bounds to include both points
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: currentLocation.lat, lng: currentLocation.lng });
    bounds.extend({ lat: destination.lat, lng: destination.lng });
    map.fitBounds(bounds, 60);
  }, [destination, currentLocation.lat, currentLocation.lng, map]);

  // Direction arrow rotation (relative to current Street View heading)
  const destBearing = destination
    ? computeBearing(currentLocation, destination)
    : 0;
  const destDistance = destination
    ? computeDistance(currentLocation, destination)
    : 0;
  const arrowRotation = destBearing - currentPov.heading;

  // Auto-center on the user's GPS position the first time map + panorama are ready
  const initialGpsDoneRef = useRef(false);
  useEffect(() => {
    if (!map || !panorama || !marker) return;
    if (initialGpsDoneRef.current) return;
    if (!navigator.geolocation) return;
    initialGpsDoneRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(pos);
        panorama.setPosition(pos);
        marker.setPosition(pos);
        setCurrentLocation(pos);
      },
      () => {
        // GPS denied or unavailable — keep default Times Square view silently
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, [map, panorama, marker]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: t.explorer.geolocation_not_supported,
        description: t.explorer.geolocation_not_supported,
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        if (map && panorama && marker) {
          map.setCenter(pos);
          panorama.setPosition(pos);
          marker.setPosition(pos);
          setCurrentLocation(pos);
        }
      },
      () => {
        toast({
          title: t.explorer.location_access_denied,
          description: t.explorer.please_allow_location,
          variant: "destructive"
        });
      }
    );
  };

  const handleAnalyze = () => {
    if (!panorama) return;
    
    const pos = panorama.getPosition();
    const pov = panorama.getPov();
    
    if (!pos) return;
    
    analyzeMutation.mutate({
      data: {
        lat: pos.lat(),
        lng: pos.lng(),
        heading: pov.heading,
        pitch: pov.pitch
      }
    }, {
      onError: () => {
        toast({
          title: t.explorer.analysis_failed,
          description: t.explorer.analysis_error,
          variant: "destructive"
        });
      }
    });
  };

  if (isMapsLoading && !isLoaded && !error) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Caricamento Google Maps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-foreground p-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Google Maps non si carica
            </CardTitle>
            <CardDescription className="text-sm mt-2 space-y-2">
              <p>La chiave API di Google Maps non e' configurata correttamente. Assicurati di aver abilitato queste API nella <strong>Google Cloud Console</strong>:</p>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                <li><strong>Maps JavaScript API</strong></li>
                <li><strong>Street View Static API</strong></li>
                <li><strong>Geocoding API</strong></li>
              </ul>
              <p className="mt-2">Vai su <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" className="text-primary underline">console.cloud.google.com/apis/library</a></p>
              <p className="text-xs text-muted-foreground mt-3">Errore tecnico: {error.message}</p>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const data = analyzeMutation.data;

  // Leggi ad alta voce il risultato AI quando in voice mode
  useEffect(() => {
    if (isVoiceMode && data?.description) {
      speak(data.description, currentLangCode + "-" + currentLangCode.toUpperCase());
    }
  }, [data, isVoiceMode, speak, currentLangCode]);

  // Voice mode command handler
  useEffect(() => {
    setOnCommand((cmd) => {
      if (cmd.type === "search") {
        setSearchQuery(cmd.query);
        speak(`Cerco ${cmd.query}`, currentLangCode);
      } else if (cmd.type === "analyze") {
        handleAnalyze();
        speak("Analisi in corso", currentLangCode);
      } else if (cmd.type === "show_poi") {
        setShowPois(true);
        speak("POI mostrati", currentLangCode);
      } else if (cmd.type === "hide_poi") {
        setShowPois(false);
        speak("POI nascosti", currentLangCode);
      } else if (cmd.type === "my_location") {
        handleUseMyLocation();
        speak("Uso la tua posizione", currentLangCode);
      }
    });
  }, [setOnCommand, speak, handleAnalyze, handleUseMyLocation]);


// Nearby POI announcements for smart glasses
  const announcedPoisRef = useRef<Map<string, number>>(new Map());
  const POI_ANNOUNCE_RADIUS = 100; // meters
  const POI_ANNOUNCE_COOLDOWN = 5 * 60 * 1000; // 5 minutes

useEffect(() => {
    if (!isVoiceMode || !showPois) return;
    
    const checkNearbyPois = () => {
      const now = Date.now();
      const nearbyPois = lastPoiResultsRef.current.filter((place) => {
        if (!place.geometry?.location || !place.name) return false;
        const dist = computeDistance(currentLocation, {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        if (dist > POI_ANNOUNCE_RADIUS) return false;
        if (selectedCategories.length > 0 && !selectedCategories.some((cat) => (place.types ?? []).includes(cat))) return false;
        const lastAnnounced = announcedPoisRef.current.get(place.place_id ?? place.name ?? "");
        if (lastAnnounced && now - lastAnnounced < POI_ANNOUNCE_COOLDOWN) return false;
        return true;
      });

      if (nearbyPois.length === 0) return;

      const toAnnounce = nearbyPois.slice(0, 2);
      const langCode = currentLangCode + "-" + currentLangCode.toUpperCase();

      toAnnounce.forEach((place, i) => {
        const key = place.place_id ?? place.name ?? "";
        announcedPoisRef.current.set(key, now);
        const type = friendlyType(place.types);
        const dist = Math.round(computeDistance(currentLocation, {
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng(),
        }));
        setTimeout(() => {
          speak(`${type}: ${place.name}, a ${dist} metri`, langCode);
        }, i * 3000);
      });
    };

    // Controlla subito e poi ogni 30 secondi
    checkNearbyPois();
    const interval = setInterval(checkNearbyPois, 30000);
    return () => clearInterval(interval);
  }, [currentLocation.lat, currentLocation.lng, isVoiceMode, showPois, speak, currentLangCode, selectedCategories]);
  const showResultPanel = showResults && !!data;

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden relative">
      {/* Compact top bar */}
      <div className="flex-shrink-0 z-30 bg-background/90 backdrop-blur border-b border-border/40">
        <div className="px-3 py-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-1">
            <div className="bg-primary/20 p-1.5 rounded-md">
              <Navigation className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight hidden sm:inline">
              Street Explorer
            </span>
          </div>

{/* Category panel button */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className={`h-8 px-2.5 border-white/10 text-xs ${selectedCategories.length > 0 ? "bg-primary/20 text-primary border-primary/30" : "bg-card/30"}`}
              onClick={() => setShowCategoryPanel((v) => !v)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
              Categorie
              {selectedCategories.length > 0 && (
                <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-primary text-primary-foreground">
                  {selectedCategories.length}
                </Badge>
              )}
            </Button>
            <AnimatePresence>
              {showCategoryPanel && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-10 z-50 w-72 rounded-xl border border-white/10 bg-card/95 backdrop-blur shadow-2xl p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtra per categoria</span>
                    {selectedCategories.length > 0 && (
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => setSelectedCategories([])}
                      >
                        Rimuovi filtri
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POI_CATEGORY_GROUPS.map((group) => {
                      const isSelected = group.types.some((t) => selectedCategories.includes(t));
                      return (
                        <button
                          key={group.label}
                          onClick={() => {
                            setSelectedCategories((prev) => {
                              const hasAny = group.types.some((t) => prev.includes(t));
                              if (hasAny) {
                                return prev.filter((c) => !group.types.includes(c));
                              } else {
                                return [...prev, ...group.types];
                              }
                            });
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                          }`}
                        >
                          {group.label}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSearch} className="flex gap-1 flex-1 min-w-[180px]">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
		placeholder="Cerca indirizzo"
className="pl-6 h-9 bg-card/50 border-white/10 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={isGeocoding}
              className="h-9 px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Vai
            </Button>
          </form>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-white/10 bg-card/30 hover:bg-card/80"
              onClick={handleUseMyLocation}
              title={t.explorer.use_my_location}
            >
              <MapPin className="h-4 w-4 text-primary" />
              <span className="hidden md:inline ml-1.5">Posizione</span>
            </Button>
            <Link href="/camera">
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-primary/30 bg-primary/10 hover:bg-primary/20"
                title={t.explorer.open_camera}
              >
                <Camera className="h-4 w-4 text-primary" />
                <span className="hidden md:inline ml-1.5">Fotocamera</span>
              </Button>
            </Link>
            <Button
              size="sm"
              className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || !isLoaded}
            >
              {analyzeMutation.isPending ? (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span className="hidden md:inline ml-1.5">
                {analyzeMutation.isPending ? t.explorer.analyzing : t.explorer.analyze}
              </span>
            </Button>

            {/* Language selector */}
            <div className="relative">
              <LanguageSelectorInline />
            </div>

            {/* Voice mode button */}
            {isVoiceSupported && (
              <Button
                variant={isVoiceMode ? "default" : "outline"}
                size="sm"
                className={`h-9 border-white/10 ${isVoiceMode ? "bg-primary text-primary-foreground" : "bg-card/30 hover:bg-card/80"}`}
                onClick={() => {
                  toggleVoiceMode();
                  if (!isVoiceMode) {
                    // Unlock audio on mobile with a silent utterance
                    const u = new SpeechSynthesisUtterance(" ");
                    u.volume = 0;
                    window.speechSynthesis.speak(u);
                  }
                }}
                title={isVoiceMode ? "Disattiva modalità vocale" : "Attiva modalità vocale"}
              >
                {isVoiceMode ? <Volume2 className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span className="hidden md:inline ml-1.5">{isVoiceMode ? "Voce ON" : "Voce"}</span>
              </Button>
            )}

{/* Help button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 border-white/10 bg-card/30 hover:bg-card/80 p-0"
                >
                  <span className="text-sm font-bold text-primary">?</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Comandi vocali</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <p><span className="text-primary font-medium">"Vai a [posto]"</span> — naviga verso una destinazione</p>
                  <p><span className="text-primary font-medium">"Analizza"</span> — analizza la scena con AI</p>
                  <p><span className="text-primary font-medium">"Mostra POI"</span> — mostra i punti di interesse</p>
                  <p><span className="text-primary font-medium">"Nascondi POI"</span> — nasconde i punti di interesse</p>
                  <p><span className="text-primary font-medium">"Posizione"</span> — usa la tua posizione GPS</p>
                  <p><span className="text-primary font-medium">"Italiano / Inglese / Francese..."</span> — cambia lingua</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Tieni premuto il pulsante microfono e parla.</p>
              </DialogContent>
            </Dialog>


            {/* User menu */}
            <div className="relative group">
              <button
                className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
                title={user?.firstName ?? "Account"}
              >
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-white/10 bg-card/95 backdrop-blur shadow-xl opacity-0 pointer-events-none group-focus-within:opacity-100 group-hover:opacity-100 group-hover:pointer-events-auto transition-all">
                <div className="p-3 border-b border-white/10">
                  <p className="text-sm font-semibold truncate">{user?.fullName ?? user?.firstName ?? "Utente"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors rounded-b-xl"
                  onClick={() => signOut({ redirectUrl: "/" })}
                >
                  <LogOut className="h-4 w-4" />
                  Esci
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* POI search/filter row */}
        <div className="px-3 pb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPois((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-white/10 bg-card/30 hover:bg-card/60 text-xs transition-colors"
            title={showPois ? t.explorer.show_poi : t.explorer.show_poi}
          >
            {showPois ? (
              <Eye className="h-3.5 w-3.5 text-primary" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="font-medium">POI</span>
            {showPois && (
              <Badge
                variant="outline"
                className="ml-1 h-5 px-1.5 text-[10px] border-primary/30 bg-primary/10 text-primary"
              >
                {poiCount}
              </Badge>
            )}
          </button>

<div className="relative w-24">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t.explorer.filter_poi}
className="pl-6 pr-6 h-8 bg-card/40 border-white/10 text-[9px]"
              value={poiFilter}
              onChange={(e) => setPoiFilter(e.target.value)}
              disabled={!showPois}
            />
            {poiFilter && (
              <button
                type="button"
                onClick={() => setPoiFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

<form
            onSubmit={handleSetDestination}
            className="flex items-center gap-1 min-w-0 flex-1"
          >
            <div className="relative flex-1">
              <Navigation2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-primary" />
              <Input
                placeholder={t.explorer.destination}
className="pl-6 pr-2 h-8 bg-card/40 border-white/10 text-[9px] placeholder:text-[9px]"
                value={destinationQuery}
                onChange={(e) => setDestinationQuery(e.target.value)}
              />
              {destination && (
                <button
                  type="button"
                  onClick={clearDestination}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title={t.explorer.cancel_destination}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={isGeocodingDest || !destinationQuery.trim()}
              className="h-8 px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              {isGeocodingDest ? "..." : t.explorer.go}
            </Button>
          </form>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono ml-auto">
            <Compass className="h-3 w-3 text-primary" />
            {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-primary/20">
              {Math.round(currentPov.heading)}°
            </Badge>
          </div>
        </div>
      </div>

{/* Street View full area */}
      <div className="flex-1 relative" style={{ contain: "strict" }}>
        <div ref={panoRef} className="absolute inset-0 bg-muted" />

        {/* Selected POI overlay (text uses mix-blend-mode so it stays readable on any background) */}
        <AnimatePresence>
          {selectedPanoPlace && (
            <motion.div
              key={selectedPanoPlace.name}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="absolute top-4 left-4 z-30 max-w-sm w-[calc(100%-2rem)] sm:w-auto"
            >
              <div
                className="px-4 py-3 rounded-xl border-2"
                style={{
                  color: "#ffffff",
                  borderColor: "rgba(255,255,255,0.85)",
                  backgroundColor: "rgba(0,0,0,0.75)",
                  textShadow: "0 0 4px rgba(0,0,0,0.6)",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{selectedPanoPlace.emoji}</span>
                    <h3 className="font-bold text-base leading-tight truncate">
                      {selectedPanoPlace.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPanoPlace(null);
                    }}
                    className="opacity-90 hover:opacity-100"
                    style={{ pointerEvents: "auto" }}
                    aria-label="Chiudi"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div
                  className="text-[11px] uppercase tracking-wider mb-1 opacity-90"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {selectedPanoPlace.type}
                </div>
                {selectedPanoPlace.address && (
                  <div className="text-xs leading-snug mb-1.5 opacity-95">
                    {selectedPanoPlace.address}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs mb-1.5 flex-wrap">
                  {selectedPanoPlace.rating !== undefined && (
                    <span>
                      ★ {selectedPanoPlace.rating.toFixed(1)}
                      {selectedPanoPlace.userRatings
                        ? ` (${selectedPanoPlace.userRatings})`
                        : ""}
                    </span>
                  )}
                  {selectedPanoPlace.openNow !== undefined && (
                    <span>
                      {selectedPanoPlace.openNow ? "● Aperto" : "● Chiuso"}
                    </span>
                  )}
                </div>
                {selectedPanoPlace.summary && (
                  <p
                    className="text-xs leading-relaxed overflow-hidden mb-3"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 6,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {selectedPanoPlace.summary}
                  </p>
                )}
                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {selectedPanoPlace.website ? (
                    <a
                      href={selectedPanoPlace.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Sito Web
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-xs opacity-60 cursor-not-allowed">
                      <MapPinOff className="h-3 w-3" />
                      Nessun link
                    </div>
                  )}
                  {selectedPanoPlace.lat !== undefined && selectedPanoPlace.lng !== undefined && (
                    <button
                      onClick={() => handleSetDestinationFromPOI({ name: selectedPanoPlace.name, lat: selectedPanoPlace.lat, lng: selectedPanoPlace.lng })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
                    >
                      <Navigation className="h-3 w-3" />
                      Direzione
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Direction-to-destination indicator */}
        {destination && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
            <div className="bg-background/85 backdrop-blur border border-primary/40 rounded-full p-3 shadow-2xl shadow-black/50">
              <svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                style={{
                  transform: `rotate(${arrowRotation}deg)`,
                  transition: "transform 200ms ease-out",
                }}
              >
                <circle cx="28" cy="28" r="26" fill="rgba(0,209,178,0.08)" stroke="rgba(0,209,178,0.3)" strokeWidth="1" />
                <path
                  d="M28 6 L40 38 L28 32 L16 38 Z"
                  fill="#00d1b2"
                  stroke="#0b0b0b"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="bg-background/85 backdrop-blur border border-border rounded-full px-3 py-1 text-xs font-medium flex items-center gap-2 max-w-[280px]">
              <span className="text-primary font-semibold">
                {destDistance < 1000
                  ? `${Math.round(destDistance)} m`
                  : `${(destDistance / 1000).toFixed(2)} km`}
              </span>
              <span className="text-muted-foreground truncate">
                {destination.label}
              </span>
            </div>
          </div>
        )}

        {/* Mini map overlay */}
        <div className="absolute bottom-4 right-4 w-56 h-40 sm:w-64 sm:h-48 rounded-xl overflow-hidden border-2 border-border shadow-2xl shadow-black/50 z-20 transition-transform hover:scale-105">
          <div ref={mapRef} className="w-full h-full bg-muted" />
        </div>

        {/* Analysis result slide-up panel */}
        <AnimatePresence>
          {showResultPanel && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="absolute inset-x-0 bottom-0 max-h-[70%] z-30 bg-background/95 backdrop-blur border-t border-border rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-4 py-2 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className="bg-primary text-primary-foreground hover:bg-primary text-[10px]">
                    {data!.environment.areaType}
                  </Badge>
                  {data!.location.formattedAddress && (
                    <span className="text-xs text-muted-foreground truncate">
                      {data!.location.formattedAddress}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowResults(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                  <p className="text-sm leading-relaxed">{data!.environment.summary}</p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {data!.environment.landmarks.length > 0 && (
                      <div>
                        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <Building className="h-3 w-3" /> Punti d'interesse
                        </h3>
                        <ul className="space-y-1">
                          {data!.environment.landmarks.map((item, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-1">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data!.environment.businesses.length > 0 && (
                      <div>
                        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <Store className="h-3 w-3" /> Attivita' commerciali
                        </h3>
                        <ul className="space-y-1">
                          {data!.environment.businesses.map((item, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-1">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data!.environment.infrastructure.length > 0 && (
                      <div>
                        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <Navigation2 className="h-3 w-3" /> Infrastrutture
                        </h3>
                        <ul className="space-y-1">
                          {data!.environment.infrastructure.map((item, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-1">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Trees className="h-3 w-3" /> Atmosfera
                      </h3>
                      <p className="text-sm italic text-card-foreground/80">
                        "{data!.environment.atmosphere}"
                      </p>
                    </div>
                  </div>

                  {data!.environment.safetyNote && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2 items-start">
                      <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs">{data!.environment.safetyNote}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reopen button if dismissed */}
        {data && !showResults && (
          <button
            type="button"
            onClick={() => setShowResults(true)}
            className="absolute bottom-4 left-4 z-20 bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium shadow-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            Mostra analisi
          </button>
        )}
      </div>
    </div>
  );
}
