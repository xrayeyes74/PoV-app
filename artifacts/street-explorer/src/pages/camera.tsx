import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useAnalyzeStreetView } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Camera as CameraIcon,
  MapPin,
  Building,
  Store,
  ShieldAlert,
  Trees,
  Navigation2,
  Zap,
  ArrowLeft,
  RefreshCw,
  X,
  SwitchCamera,
  CheckCircle2,
  HelpCircle,
  Compass,
  LogOut,
  User,
} from "lucide-react";
import { useUser, useClerk } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type FacingMode = "environment" | "user";

// ─── AR helpers ──────────────────────────────────────────────────────────────

const AR_HFOV = 60; // horizontal field-of-view degrees (typical mobile camera)
const AR_VFOV = 45; // vertical FOV

function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingTo(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const deg = (r: number) => (r * 180) / Math.PI;
  const lat1 = rad(from.lat);
  const lat2 = rad(to.lat);
  const dLng = rad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

function emojiForTypes(types: string[]): string {
  if (types.some((t) => ["restaurant", "cafe", "bar", "food", "bakery"].includes(t))) return "🍽️";
  if (types.includes("lodging")) return "🏨";
  if (types.some((t) => ["store", "shopping_mall", "clothing_store", "supermarket"].includes(t))) return "🛍️";
  if (types.some((t) => ["museum", "art_gallery"].includes(t))) return "🏛️";
  if (types.includes("park")) return "🌳";
  if (types.some((t) => ["school", "university"].includes(t))) return "🎓";
  if (types.some((t) => ["hospital", "doctor", "pharmacy"].includes(t))) return "⚕️";
  if (types.some((t) => ["bank", "atm"].includes(t))) return "🏦";
  if (types.some((t) => ["church", "place_of_worship"].includes(t))) return "⛪";
  if (types.some((t) => ["bus_station", "train_station", "subway_station", "transit_station"].includes(t))) return "🚉";
  if (types.includes("tourist_attraction")) return "📸";
  if (types.includes("gas_station")) return "⛽";
  if (types.includes("parking")) return "🅿️";
  if (types.includes("gym")) return "🏋️";
  if (types.includes("night_club")) return "🎉";
  return "📍";
}

function friendlyType(types: string[]): string {
  const map: Record<string, string> = {
    restaurant: "Ristorante", cafe: "Caffè", bar: "Bar", bakery: "Panetteria",
    lodging: "Hotel", store: "Negozio", shopping_mall: "Centro commerciale",
    supermarket: "Supermercato", museum: "Museo", art_gallery: "Galleria d'arte",
    park: "Parco", school: "Scuola", university: "Università",
    hospital: "Ospedale", doctor: "Medico", pharmacy: "Farmacia",
    bank: "Banca", atm: "Bancomat", church: "Chiesa",
    place_of_worship: "Luogo di culto", bus_station: "Fermata bus",
    train_station: "Stazione", subway_station: "Metropolitana",
    tourist_attraction: "Attrazione turistica", gas_station: "Distributore",
    parking: "Parcheggio", gym: "Palestra", night_club: "Locale notturno",
  };
  for (const t of types) if (map[t]) return map[t];
  return "Punto d'interesse";
}

type ArPoi = {
  placeId: string;
  name: string;
  types: string[];
  lat: number;
  lng: number;
  vicinity?: string;
  rating?: number;
  userRatingsTotal?: number;
  iconBgColor?: string;
};

type PlaceDetails = {
  name?: string;
  formattedAddress?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  weekdayText?: string[];
  editorialSummary?: string;
  website?: string;
  phone?: string;
  priceLevel?: number;
  types?: string[];
  iconBgColor?: string;
};

// ─────────────────────────────────────────────────────────────────────────────

export default function CameraPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { signOut } = useClerk();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // AR state
  const [arPois, setArPois] = useState<ArPoi[]>([]);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [devicePitch, setDevicePitch] = useState(0); // degrees, 0 = vertical/horizon
  const [compassPermission, setCompassPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [selectedArPoi, setSelectedArPoi] = useState<ArPoi | null>(null);
  const [selectedPoiDetails, setSelectedPoiDetails] = useState<PlaceDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showAr, setShowAr] = useState(true);

  const analyzeMutation = useAnalyzeStreetView();

  // ── Fetch Place Details on tap ─────────────────────────────────────────────
  const handleSelectArPoi = useCallback((poi: ArPoi) => {
    setSelectedArPoi(poi);
    setSelectedPoiDetails(null);
    setIsLoadingDetails(true);
    const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    fetch(`${BASE}/api/streetview/place-details?placeId=${encodeURIComponent(poi.placeId)}`)
      .then((r) => r.json())
      .then((data: PlaceDetails) => setSelectedPoiDetails(data))
      .catch(() => {/* ignore */})
      .finally(() => setIsLoadingDetails(false));
  }, []);

  // ── Compass / DeviceOrientation ────────────────────────────────────────────
  const requestCompassPermission = useCallback(async () => {
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof DOE.requestPermission === "function") {
      try {
        const state = await DOE.requestPermission();
        setCompassPermission(state === "granted" ? "granted" : "denied");
        return state === "granted";
      } catch {
        setCompassPermission("denied");
        return false;
      }
    }
    // Android / desktop — no permission needed
    setCompassPermission("granted");
    return true;
  }, []);

  useEffect(() => {
    let active = true;
    const handler = (e: DeviceOrientationEvent) => {
      if (!active) return;
      // iOS Safari: webkitCompassHeading gives true north (0=N, CW)
      const ios = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (ios.webkitCompassHeading != null) {
        setDeviceHeading(ios.webkitCompassHeading);
      } else if (e.absolute && e.alpha != null) {
        // Android absolute: alpha is CCW from north → compass = (360 - alpha) % 360
        setDeviceHeading((360 - e.alpha) % 360);
      }
      // beta: 90=phone upright (portrait). pitchDeg=0 means pointing at horizon.
      if (e.beta != null) {
        setDevicePitch(e.beta - 90);
      }
    };

    const setup = async () => {
      const granted = await requestCompassPermission();
      if (!granted) return;
      window.addEventListener("deviceorientationabsolute" as "deviceorientation", handler as EventListener, true);
      window.addEventListener("deviceorientation", handler as EventListener, true);
    };
    setup();
    return () => {
      active = false;
      window.removeEventListener("deviceorientationabsolute" as "deviceorientation", handler as EventListener, true);
      window.removeEventListener("deviceorientation", handler as EventListener, true);
    };
  }, [requestCompassPermission]);

  // ── Fetch POIs from backend when coords change ─────────────────────────────
  useEffect(() => {
    if (!coords) return;
    const controller = new AbortController();
    const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    fetch(
      `${BASE}/api/streetview/places?lat=${coords.lat}&lng=${coords.lng}&radius=200`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((data: { places?: ArPoi[] }) => {
        if (data.places) setArPois(data.places);
      })
      .catch(() => {/* ignore abort/network errors */});
    return () => controller.abort();
  }, [coords]);

  // ── GPS watch (continuous, for AR accuracy) ────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── Compute AR projected positions ────────────────────────────────────────
  const arProjections = (() => {
    if (!coords || deviceHeading === null || !showAr) return [];
    return arPois
      .map((poi) => {
        const bearing = bearingTo(coords, poi);
        const offset = ((bearing - deviceHeading + 540) % 360) - 180; // -180..+180
        if (Math.abs(offset) > AR_HFOV / 2 + 5) return null; // not in view
        const dist = haversineDistance(coords, poi);
        const xPct = 50 + (offset / AR_HFOV) * 100;
        // Vertical: horizon shifts with device pitch
        const yPct = 50 + (devicePitch / AR_VFOV) * 100 + 15; // +15 → slightly below horizon
        const clampedY = Math.max(20, Math.min(78, yPct));
        // Scale badges by proximity (closer = larger)
        const scale = Math.max(0.7, Math.min(1.15, 1 - dist / 800));
        return { poi, xPct, yPct: clampedY, dist, scale, emoji: emojiForTypes(poi.types) };
      })
      .filter(Boolean) as {
        poi: ArPoi;
        xPct: number;
        yPct: number;
        dist: number;
        scale: number;
        emoji: string;
      }[];
  })();

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode: FacingMode) => {
      setCameraError(null);
      setCameraReady(false);
      stopStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setCameraError(msg);
      }
    },
    [stopStream],
  );

  // Start camera on mount and when facing changes
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Get GPS on mount (first fix for loading state, then watch for AR updates)
  useEffect(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        toast({
          title: "Posizione non disponibile",
          description: "Concedi i permessi di localizzazione per un'analisi piu' accurata.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [toast]);

  const handleRetryGps = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      () => { setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    const maxDim = 1024;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
  };

  const handleAnalyze = () => {
    if (!capturedImage) return;
    if (!coords) {
      toast({
        title: "Posizione mancante",
        description:
          "Serve la posizione GPS per analizzare l'ambiente. Riprova ad attivare la geolocalizzazione.",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate(
      {
        data: {
          lat: coords.lat,
          lng: coords.lng,
          imageUrl: capturedImage,
          compareWithStreetView: true,
        },
      },
      {
        onError: () => {
          toast({
            title: "Analisi fallita",
            description:
              "Non sono riuscito ad analizzare la foto. Riprova o scatta di nuovo.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleRetake = () => {
    setCapturedImage(null);
    analyzeMutation.reset();
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon" className="bg-black/40 backdrop-blur text-white hover:bg-black/60">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
          {/* Compass heading badge */}
          <Badge variant="outline" className="bg-black/40 backdrop-blur border-white/20 text-white font-mono">
            <Compass className="h-3 w-3 mr-1 text-primary" />
            {deviceHeading !== null ? `${Math.round(deviceHeading)}°` : "—"}
          </Badge>

          {/* GPS badge */}
          <Badge variant="outline" className="bg-black/40 backdrop-blur border-white/20 text-white">
            <MapPin className="h-3 w-3 mr-1 text-primary" />
            {gpsLoading ? "GPS..." : coords
              ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`
              : "GPS non disp."}
          </Badge>

          {!coords && !gpsLoading && (
            <Button variant="ghost" size="icon" className="bg-black/40 backdrop-blur text-white hover:bg-black/60 h-8 w-8" onClick={handleRetryGps}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {/* AR toggle */}
          {arPois.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-3 backdrop-blur text-white text-xs ${showAr ? "bg-primary/60 hover:bg-primary/80" : "bg-black/40 hover:bg-black/60"}`}
              onClick={() => setShowAr((v) => !v)}
            >
              AR {showAr ? "ON" : "OFF"}
              {showAr && arProjections.length > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-white/20 text-white border-0">
                  {arProjections.length}
                </Badge>
              )}
            </Button>
          )}

          {/* iOS: request compass if not yet granted */}
          {compassPermission === "unknown" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 bg-black/40 backdrop-blur text-white hover:bg-black/60 text-xs"
              onClick={requestCompassPermission}
            >
              <Compass className="h-3.5 w-3.5 mr-1" />
              Attiva bussola
            </Button>
          )}

          {/* User avatar */}
          <div className="relative group">
            <button
              className="h-8 w-8 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
              title={user?.firstName ?? "Account"}
            >
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="h-3.5 w-3.5 text-white" />
              )}
            </button>
            <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-white/10 bg-black/90 backdrop-blur shadow-xl opacity-0 pointer-events-none group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity">
              <div className="p-3 border-b border-white/10">
                <p className="text-xs font-semibold text-white truncate">{user?.fullName ?? user?.firstName ?? "Utente"}</p>
                <p className="text-[10px] text-white/50 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors rounded-b-xl"
                onClick={() => signOut({ redirectUrl: "/" })}
              >
                <LogOut className="h-3.5 w-3.5" />
                Esci
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera / Captured image area */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {cameraError && !capturedImage && (
          <div className="p-6 text-center max-w-md">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <ShieldAlert className="h-8 w-8 text-destructive mx-auto" />
                <h2 className="font-semibold">Fotocamera non disponibile</h2>
                <p className="text-sm text-muted-foreground">
                  Concedi i permessi della fotocamera nel browser e riprova. Su
                  iPhone usa Safari.
                </p>
                <p className="text-xs text-muted-foreground/70 break-words">
                  {cameraError}
                </p>
                <Button
                  onClick={() => startCamera(facingMode)}
                  className="bg-primary text-primary-foreground"
                >
                  Riprova
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${capturedImage || cameraError ? "hidden" : "block"}`}
        />

        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* ── AR overlay: POI markers projected onto the camera feed ── */}
        {cameraReady && !capturedImage && facingMode === "environment" && showAr && (
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            <AnimatePresence>
              {arProjections.map(({ poi, xPct, yPct, dist, scale, emoji }) => {
                const bgColor = poi.iconBgColor ?? "#00d1b2";
                const isSelected = selectedArPoi?.placeId === poi.placeId;
                return (
                  <motion.div
                    key={poi.placeId}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: isSelected ? scale * 1.15 : scale }}
                    exit={{ opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.2 }}
                    className="absolute pointer-events-auto"
                    style={{
                      left: `${xPct}%`,
                      top: `${yPct}%`,
                      transform: `translate(-50%, -100%)`,
                      transformOrigin: "50% 100%",
                    }}
                    onClick={() => handleSelectArPoi(poi)}
                  >
                    <div className="flex flex-col items-center cursor-pointer select-none">
                      {/* ── SVG pin (identical to panorama marker) ── */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="52"
                        height="66"
                        viewBox="0 0 52 66"
                        className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)]"
                        style={{ filter: isSelected ? `drop-shadow(0 0 6px ${bgColor})` : undefined }}
                      >
                        <defs>
                          <filter id={`s-${poi.placeId}`} x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.55" />
                          </filter>
                        </defs>
                        <path
                          filter={`url(#s-${poi.placeId})`}
                          d="M26 0C11.64 0 0 11.64 0 26c0 18 26 40 26 40s26-22 26-40C52 11.64 40.36 0 26 0z"
                          fill={bgColor}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                        />
                        <circle cx="26" cy="26" r="17" fill="#ffffff" />
                        <text x="26" y="33" fontSize="22" textAnchor="middle">{emoji}</text>
                      </svg>

                      {/* ── Label pill below the pin ── */}
                      <div
                        className="mt-0.5 px-2 py-0.5 rounded-full shadow-lg border border-white/30 flex items-center gap-1"
                        style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)", maxWidth: 160 }}
                      >
                        <span className="text-white text-[10px] font-semibold leading-tight truncate">
                          {poi.name}
                        </span>
                        <span className="text-[10px] leading-tight font-mono shrink-0" style={{ color: bgColor }}>
                          {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}
                        </span>
                        {poi.rating && (
                          <span className="text-amber-400 text-[10px] shrink-0">★{poi.rating.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* No compass yet notice */}
            {deviceHeading === null && compassPermission === "granted" && coords && (
              <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-full px-4 py-2 text-white/80 text-xs flex items-center gap-2">
                <Compass className="h-3.5 w-3.5 text-primary animate-spin-slow" />
                In attesa della bussola…
              </div>
            )}
          </div>
        )}

        {/* ── Selected AR POI detail overlay ── */}
        <AnimatePresence>
          {selectedArPoi && !capturedImage && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-28 left-3 right-3 z-25 rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
              style={{ background: "rgba(10,10,10,0.88)", backdropFilter: "blur(14px)" }}
            >
              {/* Colored top accent bar using icon bg color */}
              <div
                className="h-1 w-full"
                style={{ background: selectedPoiDetails?.iconBgColor ?? selectedArPoi.iconBgColor ?? "#00d1b2" }}
              />
              <div className="p-4 pb-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* SVG mini-pin */}
                    <svg width="32" height="41" viewBox="0 0 52 66" className="shrink-0">
                      <path
                        d="M26 0C11.64 0 0 11.64 0 26c0 18 26 40 26 40s26-22 26-40C52 11.64 40.36 0 26 0z"
                        fill={selectedPoiDetails?.iconBgColor ?? selectedArPoi.iconBgColor ?? "#00d1b2"}
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                      <circle cx="26" cy="26" r="17" fill="#ffffff" />
                      <text x="26" y="33" fontSize="22" textAnchor="middle">
                        {emojiForTypes(selectedPoiDetails?.types ?? selectedArPoi.types)}
                      </text>
                    </svg>
                    <div className="min-w-0">
                      <h3 className="text-white font-bold text-[15px] leading-tight truncate">
                        {selectedPoiDetails?.name ?? selectedArPoi.name}
                      </h3>
                      <p className="text-white/50 text-[11px] font-medium mt-0.5">
                        {friendlyType(selectedPoiDetails?.types ?? selectedArPoi.types)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedArPoi(null); setSelectedPoiDetails(null); }}
                    className="text-white/40 hover:text-white shrink-0 mt-0.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Loading spinner */}
                {isLoadingDetails && (
                  <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
                    <div className="h-3.5 w-3.5 rounded-full border border-primary/40 border-t-primary animate-spin" />
                    Caricamento dettagli…
                  </div>
                )}

                {/* Editorial summary */}
                {selectedPoiDetails?.editorialSummary && (
                  <p className="text-white/75 text-[12px] leading-relaxed mb-3 italic">
                    "{selectedPoiDetails.editorialSummary}"
                  </p>
                )}

                {/* Address */}
                {(selectedPoiDetails?.formattedAddress ?? selectedArPoi.vicinity) && (
                  <p className="text-white/55 text-[11px] mb-2.5 flex items-start gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                    {selectedPoiDetails?.formattedAddress ?? selectedArPoi.vicinity}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  {/* Open/Closed */}
                  {selectedPoiDetails && selectedPoiDetails.openNow !== undefined && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${selectedPoiDetails.openNow ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {selectedPoiDetails.openNow ? "Aperto ora" : "Chiuso"}
                    </span>
                  )}
                  {/* Rating */}
                  {(selectedPoiDetails?.rating ?? selectedArPoi.rating) && (
                    <span className="text-amber-400 text-[12px] font-semibold flex items-center gap-1">
                      ★ {(selectedPoiDetails?.rating ?? selectedArPoi.rating)!.toFixed(1)}
                      {(selectedPoiDetails?.userRatingsTotal ?? selectedArPoi.userRatingsTotal) && (
                        <span className="text-white/40 font-normal text-[10px]">
                          ({((selectedPoiDetails?.userRatingsTotal ?? selectedArPoi.userRatingsTotal)!).toLocaleString("it-IT")})
                        </span>
                      )}
                    </span>
                  )}
                  {/* Price level */}
                  {selectedPoiDetails?.priceLevel != null && (
                    <span className="text-white/60 text-[11px]">
                      {"€".repeat(selectedPoiDetails.priceLevel)}
                    </span>
                  )}
                  {/* Distance */}
                  {coords && (
                    <span className="text-primary text-[11px] font-mono ml-auto">
                      {(() => {
                        const d = haversineDistance(coords, selectedArPoi);
                        return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(2)} km`;
                      })()}
                    </span>
                  )}
                </div>

                {/* Phone / Website */}
                {(selectedPoiDetails?.phone || selectedPoiDetails?.website) && (
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {selectedPoiDetails.phone && (
                      <a
                        href={`tel:${selectedPoiDetails.phone}`}
                        className="text-primary text-[11px] underline"
                      >
                        {selectedPoiDetails.phone}
                      </a>
                    )}
                    {selectedPoiDetails.website && (
                      <a
                        href={selectedPoiDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary/70 text-[11px] underline truncate max-w-[180px]"
                      >
                        {selectedPoiDetails.website.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom controls */}
        {!capturedImage && cameraReady && !analyzeMutation.data && (
          <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-8 z-20">
            <div className="w-12" />
            <button
              onClick={handleCapture}
              className="h-20 w-20 rounded-full border-4 border-white bg-white/20 backdrop-blur active:scale-95 transition-transform flex items-center justify-center"
              aria-label="Scatta"
            >
              <div className="h-16 w-16 rounded-full bg-white" />
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-black/40 backdrop-blur text-white hover:bg-black/60"
              onClick={() =>
                setFacingMode((m) => (m === "environment" ? "user" : "environment"))
              }
              aria-label="Cambia fotocamera"
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>
          </div>
        )}

        {capturedImage && !analyzeMutation.data && (
          <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-4 z-20">
            <Button
              variant="outline"
              size="lg"
              className="border-white/30 bg-black/40 backdrop-blur text-white hover:bg-black/60"
              onClick={handleRetake}
              disabled={analyzeMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Rifai
            </Button>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_20px_rgba(0,209,178,0.4)]"
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  Analisi in corso...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Analizza
                </>
              )}
            </Button>
          </div>
        )}

        {!cameraReady && !cameraError && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70">
            <div className="flex flex-col items-center gap-3">
              <CameraIcon className="h-8 w-8 animate-pulse" />
              <p className="text-sm">Avvio fotocamera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Result overlay */}
      <AnimatePresence>
        {analyzeMutation.data && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-x-0 bottom-0 top-16 z-40 bg-background border-t border-border rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                  {analyzeMutation.data.environment.areaType}
                </Badge>
                {analyzeMutation.data.location.city && (
                  <span className="text-xs text-muted-foreground">
                    {analyzeMutation.data.location.city}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRetake}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-6">
                {analyzeMutation.data.recognition && (
                  <div
                    className={`rounded-xl p-4 border ${
                      analyzeMutation.data.recognition.recognized
                        ? "bg-primary/10 border-primary/30"
                        : "bg-muted/40 border-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {analyzeMutation.data.recognition.recognized ? (
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                          Luogo riconosciuto
                        </div>
                        {analyzeMutation.data.recognition.recognized ? (
                          <>
                            <div className="text-base font-semibold text-card-foreground">
                              {analyzeMutation.data.recognition.placeName ??
                                "Luogo identificato"}
                            </div>
                            {analyzeMutation.data.recognition.confidence && (
                              <Badge
                                variant="outline"
                                className="mt-1 text-xs border-primary/30 text-primary bg-primary/5"
                              >
                                Affidabilita': {analyzeMutation.data.recognition.confidence}
                              </Badge>
                            )}
                            {analyzeMutation.data.recognition.matchReasoning && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {analyzeMutation.data.recognition.matchReasoning}
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Luogo non identificato con sicurezza dalla foto.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-sm leading-relaxed text-card-foreground/90">
                  {analyzeMutation.data.environment.summary}
                </p>

                <Separator className="bg-white/10" />

                {analyzeMutation.data.environment.landmarks.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                      <Building className="h-3 w-3" /> Punti di interesse
                    </h3>
                    <ul className="space-y-2">
                      {analyzeMutation.data.environment.landmarks.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analyzeMutation.data.environment.businesses.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                      <Store className="h-3 w-3" /> Attivita' commerciali
                    </h3>
                    <ul className="space-y-2">
                      {analyzeMutation.data.environment.businesses.map(
                        (item, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-primary mt-1">•</span> {item}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                {analyzeMutation.data.environment.infrastructure.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                      <Navigation2 className="h-3 w-3" /> Infrastrutture
                    </h3>
                    <ul className="space-y-2">
                      {analyzeMutation.data.environment.infrastructure.map(
                        (item, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-primary mt-1">•</span> {item}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                <Separator className="bg-white/10" />

                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <Trees className="h-3 w-3" /> Atmosfera
                  </h3>
                  <p className="text-sm text-card-foreground/80 italic">
                    "{analyzeMutation.data.environment.atmosphere}"
                  </p>
                </div>

                {analyzeMutation.data.environment.safetyNote && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-3 items-start">
                    <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive-foreground">
                      {analyzeMutation.data.environment.safetyNote}
                    </p>
                  </div>
                )}

                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleRetake}
                >
                  <CameraIcon className="h-4 w-4 mr-2" />
                  Scatta un'altra foto
                </Button>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
