import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  Aperture,
  BrainCircuit,
  Building2,
  Cable,
  Camera,
  Crosshair,
  Database,
  Flame,
  Globe2,
  Landmark,
  Layers,
  LogOut,
  MapPinned,
  Mountain,
  Newspaper,
  Orbit,
  Plane,
  Plug,
  Radio,
  RefreshCw,
  Satellite,
  Search,
  Shield,
  Ship,
  Siren,
  TowerControl,
  Upload,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Papa from "papaparse";
import Auth from "./components/Auth";
import IntelMap from "./components/IntelMap";
import TimeMachine from "./components/TimeMachine";
import { supabase } from "./lib/supabase";
import { REGION_PRESETS, RegionKey, regionContains } from "./geo";
import { AnalysisResult, CognitionLesson, IntelligenceEvent, NewsItem } from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = (import.meta as any).env.VITE_API_URL || "";

type MapLayerKey =
  | "militaryAviation"
  | "aviation"
  | "maritime"
  | "cameras"
  | "nuclear"
  | "satellites"
  | "cables"
  | "borders"
  | "osmSearch"
  | "militaryBases"
  | "embassies"
  | "volcanoes"
  | "seaports"
  | "lighthouses"
  | "spaceports"
  | "iranWarLive"
  | "civilUnrest"
  | "conflictEvents"
  | "earthquakes"
  | "airports"
  | "sanctions"
  | "news"
  | "fires"
  | "jamming"
  | "internetOutages";

type MapLayers = Record<MapLayerKey, boolean>;

const OSM_LAYER_KEYS: MapLayerKey[] = [
  "cameras",
  "nuclear",
  "cables",
  "militaryBases",
  "embassies",
  "volcanoes",
  "seaports",
  "lighthouses",
  "spaceports",
  "airports",
];

const defaultLayers: MapLayers = {
  militaryAviation: true,
  aviation: true,
  maritime: true,
  cameras: false,
  nuclear: false,
  satellites: true,
  cables: false,
  borders: true,
  osmSearch: true,
  militaryBases: false,
  embassies: false,
  volcanoes: false,
  seaports: false,
  lighthouses: false,
  spaceports: false,
  iranWarLive: false,
  civilUnrest: true,
  conflictEvents: true,
  earthquakes: true,
  airports: false,
  sanctions: false,
  news: true,
  fires: true,
  jamming: true,
  internetOutages: true,
};

const layerMeta: Record<MapLayerKey, { label: string; source: string; icon: LucideIcon; note?: string }> = {
  militaryAviation: { label: "Military aviation", source: "adsb.lol", icon: Shield },
  aviation: { label: "Aviation", source: "OpenSky", icon: Plane },
  maritime: { label: "Maritime", source: "AIS", icon: Ship },
  cameras: { label: "Cameras", source: "OSM", icon: Camera },
  nuclear: { label: "Nuclear facilities", source: "OSM", icon: Radio },
  satellites: { label: "Satellites", source: "N2YO", icon: Satellite },
  cables: { label: "Undersea cables", source: "OSM", icon: Cable },
  borders: { label: "Borders and labels", source: "CARTO", icon: MapPinned },
  osmSearch: { label: "OSM search", source: "Nominatim/Overpass", icon: Search },
  militaryBases: { label: "Military bases", source: "OSM plugin", icon: TowerControl },
  embassies: { label: "Embassies", source: "OSM plugin", icon: Landmark },
  volcanoes: { label: "Volcanoes", source: "OSM plugin", icon: Mountain },
  seaports: { label: "Seaports", source: "OSM plugin", icon: Ship },
  lighthouses: { label: "Lighthouses", source: "OSM plugin", icon: Aperture },
  spaceports: { label: "Spaceports", source: "OSM plugin", icon: Orbit },
  iranWarLive: { label: "Iran War Live", source: "Plugin slot", icon: Siren, note: "External OSINT feed ready for connector" },
  civilUnrest: { label: "Civil unrest", source: "GDELT", icon: Activity },
  conflictEvents: { label: "Conflict events", source: "GDELT", icon: Crosshair },
  earthquakes: { label: "Earthquakes", source: "USGS", icon: Activity },
  airports: { label: "Airports", source: "OSM", icon: Plane },
  sanctions: { label: "International sanctions", source: "US OFAC", icon: Building2, note: "Metadata layer; import geocoded entities for map pins" },
  news: { label: "News and EONET", source: "NewsAPI/NASA", icon: Newspaper },
  fires: { label: "Fires", source: "NASA FIRMS", icon: Flame },
  jamming: { label: "GPS jamming", source: "gpsjam.org", icon: Wifi },
  internetOutages: { label: "Internet outages", source: "IODA", icon: Globe2 },
};

const layerGroups: { title: string; keys: MapLayerKey[] }[] = [
  { title: "Live Data", keys: ["militaryAviation", "aviation", "maritime", "satellites", "civilUnrest", "conflictEvents", "earthquakes", "fires", "jamming", "internetOutages", "news"] },
  { title: "OSM Layers", keys: ["cameras", "nuclear", "cables", "airports", "militaryBases", "embassies", "volcanoes", "seaports", "lighthouses", "spaceports"] },
  { title: "Map Tools", keys: ["borders", "osmSearch", "iranWarLive", "sanctions"] },
];

const seedCognition: CognitionLesson[] = [
  {
    id: "seed-1",
    title: "Maritime chokepoint behavior",
    lesson: "Vessel clustering near narrow passages and dark AIS periods should be reviewed against regional threat streams and nearby air activity.",
    context: "ATLAS historical intelligence",
  },
  {
    id: "seed-2",
    title: "GPS interference signature",
    lesson: "GPS jamming clusters often precede aviation route changes and maritime navigation anomalies. Cross-check aircraft squawks, AIS tracks, and conflict reporting.",
    context: "Electronic warfare analysis",
  },
  {
    id: "seed-3",
    title: "Shallow seismic correlation",
    lesson: "Very shallow seismic events near conflict areas can indicate explosions or impacts. Compare with news, fire, and aviation changes before escalation.",
    context: "Seismic intelligence",
  },
];

function inferLayer(event: IntelligenceEvent): MapLayerKey {
  if (event.sourceLayer && event.sourceLayer in layerMeta) return event.sourceLayer as MapLayerKey;
  if (event.type === "aircraft") return "aviation";
  if (event.type === "vessel") return "maritime";
  if (event.type === "satellite") return "satellites";
  if (event.id.startsWith("quake-")) return "earthquakes";
  if (event.id.startsWith("firms-")) return "fires";
  if (event.id.startsWith("jam-") || event.id.startsWith("blackout-")) return "jamming";
  if (event.id.startsWith("unrest-")) return "civilUnrest";
  if (event.id.startsWith("gdelt-")) return "conflictEvents";
  return "news";
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [demoAccess, setDemoAccess] = useState(() => localStorage.getItem("ophanim_demo_access") === "true");
  const [showIntro, setShowIntro] = useState(() => localStorage.getItem("ophanim_intro_seen") !== "true");
  const [activeTab, setActiveTab] = useState<"layers" | "news" | "memory">("layers");
  const [regionKey, setRegionKey] = useState<RegionKey>("global");
  const [layers, setLayers] = useState<MapLayers>(defaultLayers);
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [layerEvents, setLayerEvents] = useState<IntelligenceEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [cognition, setCognition] = useState<CognitionLesson[]>(seedCognition);
  const [selectedEvent, setSelectedEvent] = useState<IntelligenceEvent | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoAnalysisActive, setAutoAnalysisActive] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; msg: string; score: number }[]>([]);
  const [logs, setLogs] = useState<string[]>(["System initialized"]);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(348);
  const [isLive, setIsLive] = useState(true);
  const [historicalEvents, setHistoricalEvents] = useState<IntelligenceEvent[] | null>(null);
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());
  const liveAircraftRef = useRef<Map<string, IntelligenceEvent>>(new Map());
  const liveShipsRef = useRef<Map<string, IntelligenceEvent>>(new Map());
  const isResizing = useRef(false);

  const region = REGION_PRESETS[regionKey];

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 60));
  }, []);

  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (isResizing.current) setSidebarWidth(Math.min(560, Math.max(280, startWidth + ev.clientX - startX)));
    };
    const onUp = () => {
      isResizing.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const mergeLiveData = useCallback(() => {
    setEvents((prev) => {
      const staticEvents = prev.filter((e) => !e.id.startsWith("opensky-") && !e.id.startsWith("miladsb-") && !e.id.startsWith("ais-"));
      return [...staticEvents, ...Array.from(liveAircraftRef.current.values()), ...Array.from(liveShipsRef.current.values())];
    });
  }, []);

  const saveEventsToHistory = async (eventsToSave: IntelligenceEvent[]) => {
    if (eventsToSave.length === 0) return;
    const rows = eventsToSave
      .filter((e) => e.lat && e.lng)
      .slice(0, 150)
      .map((e) => ({
        asset_id: e.id,
        asset_type: e.type,
        lat: e.lat,
        lng: e.lng,
        label: e.label,
        intensity: e.intensity,
        details: e.details,
        recorded_at: new Date().toISOString(),
      }));
    try {
      await supabase.from("event_history").insert(rows);
    } catch (err) {
      console.warn("History save failed:", err);
    }
  };

  const handleCSVImport = (file: File) => {
    setIsImporting(true);
    addLog(`Importing ${file.name}`);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedEvents: IntelligenceEvent[] = results.data.map((row: any, i: number) => ({
          id: row.id || `csv-${Date.now()}-${i}`,
          type: (["vessel", "aircraft", "conflict", "news", "satellite", "facility", "airport", "infrastructure"].includes(row.type) ? row.type : "news") as any,
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          label: row.label || "Imported object",
          intensity: parseFloat(row.intensity) || 0.5,
          details: row.details || "External data import.",
          timestamp: row.timestamp || new Date().toISOString(),
          sourceLayer: row.sourceLayer || "news",
        })).filter((e) => !Number.isNaN(e.lat) && !Number.isNaN(e.lng));

        if (importedEvents.length > 0) {
          setEvents((prev) => [...prev, ...importedEvents]);
          addLog(`Imported ${importedEvents.length} records`);
        } else {
          addLog("Import failed: no valid coordinates");
        }
        setIsImporting(false);
      },
      error: (error) => {
        addLog(`Import error: ${error.message}`);
        setIsImporting(false);
      },
    });
  };

  const fetchAircraftFeed = useCallback(async (source: "aviation" | "militaryAviation") => {
    try {
      const endpoint = source === "militaryAviation" ? "military-aircraft" : "aircraft";
      const resp = await fetch(`${API_BASE}/api/data?feed=${endpoint}&region=${regionKey}`);
      if (!resp.ok) return;
      const data = await resp.json();
      let count = 0;
      (data.ac || []).filter((a: any) => a.lat && a.lon).forEach((a: any) => {
        const flight = a.flight?.trim() || a.hex || "UNID";
        const isMilitary = source === "militaryAviation" || a.t?.includes("MIL") ||
          ["RCH", "DUKE", "FORTE", "LAGR", "HOMER", "USAF", "UAF", "JAKE", "ROCKY", "KING", "REACH", "TOPGN"].some((p) => flight.startsWith(p));
        const id = `${source === "militaryAviation" ? "miladsb" : "opensky"}-${a.hex}`;
        const prev = liveAircraftRef.current.get(id);
        const event: IntelligenceEvent = {
          id,
          type: "aircraft",
          lat: Number(a.lat),
          lng: Number(a.lon),
          label: isMilitary ? `MIL ${flight}` : flight,
          intensity: isMilitary ? 0.86 : 0.34,
          details: `${isMilitary ? "Military" : "Civil"} aircraft. Alt: ${a.alt_baro || "?"} ft. Speed: ${a.gs || "?"} kt. Squawk: ${a.squawk || "none"}. Type: ${a.t || "unknown"}.`,
          timestamp: new Date().toISOString(),
          path: [...(prev?.path || []).slice(-20), [Number(a.lat), Number(a.lon)]] as [number, number][],
          sourceLayer: source,
        };
        liveAircraftRef.current.set(id, event);
        count += 1;
      });
      mergeLiveData();
      addLog(`${layerMeta[source].source}: ${count} aircraft`);
    } catch (err) {
      addLog(`${layerMeta[source].source}: feed failed`);
    }
  }, [addLog, mergeLiveData, regionKey]);

  const fetchOsmLayer = useCallback(async (key: MapLayerKey) => {
    if (!OSM_LAYER_KEYS.includes(key)) return;
    setLoadingLayers((prev) => new Set(prev).add(key));
    try {
      const resp = await fetch(`${API_BASE}/api/data?feed=osm&layer=${key}&region=${regionKey}`);
      const data = await resp.json();
      const nextEvents = data.events || [];
      setLayerEvents((prev) => [...prev.filter((event) => event.sourceLayer !== key), ...nextEvents]);
      addLog(`${layerMeta[key].label}: ${nextEvents.length} OSM objects`);
    } catch (err) {
      addLog(`${layerMeta[key].label}: layer fetch failed`);
    } finally {
      setLoadingLayers((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [addLog, regionKey]);

  const fetchIntel = useCallback(async () => {
    addLog(`Polling ${region.label}`);
    try {
      const query = `region=${regionKey}`;
      const [newsRes, cogRes, nasaRes, quakeRes, conflictRes, unrestRes, firmsRes, satRes, jammingRes, blackoutRes] = await Promise.all([
        fetch(`${API_BASE}/api/data?feed=news&${query}`).catch(() => null),
        fetch(`${API_BASE}/api/data?feed=cognition`).catch(() => null),
        fetch(`${API_BASE}/api/data?feed=nasa`).catch(() => null),
        fetch(`${API_BASE}/api/data?feed=earthquakes&${query}`).catch(() => null),
        fetch(`${API_BASE}/api/data?feed=conflicts&${query}`).catch(() => null),
        fetch(`${API_BASE}/api/data?feed=civil-unrest&${query}`).catch(() => null),
        fetch(`${API_BASE}/api/data?feed=firms&${query}`).catch(() => null),
        fetch(`${API_BASE}/api/data?feed=satellites&${query}`).catch(() => null),
        fetch(`${API_BASE}/api/data?feed=jamming&${query}`).catch(() => null),
        fetch(`${API_BASE}/api/data?feed=blackouts&${query}`).catch(() => null),
      ]);

      const [newsData, cogData, nasaData, quakeData, conflictData, unrestData, firmsData, satData, jammingData, blackoutData] = await Promise.all([
        newsRes?.ok ? newsRes.json() : null,
        cogRes?.ok ? cogRes.json() : null,
        nasaRes?.ok ? nasaRes.json() : null,
        quakeRes?.ok ? quakeRes.json() : null,
        conflictRes?.ok ? conflictRes.json() : null,
        unrestRes?.ok ? unrestRes.json() : null,
        firmsRes?.ok ? firmsRes.text() : null,
        satRes?.ok ? satRes.json() : null,
        jammingRes?.ok ? jammingRes.json() : null,
        blackoutRes?.ok ? blackoutRes.json() : null,
      ]);

      if (newsData?.articles) setNews(newsData.articles);
      if (Array.isArray(cogData) && cogData.length > 0) setCognition(cogData);

      const scrapedEvents: IntelligenceEvent[] = [];
      const pushIfInRegion = (event: IntelligenceEvent) => {
        if (regionContains(region, event.lat, event.lng)) scrapedEvents.push(event);
      };

      if (nasaData?.events) {
        nasaData.events.forEach((e: any) => {
          const geom = e.geometry?.[0];
          if (!geom) return;
          pushIfInRegion({
            id: `nasa-${e.id}`,
            type: "news",
            lat: geom.coordinates[1],
            lng: geom.coordinates[0],
            label: `NASA EONET: ${e.title}`,
            intensity: 0.45,
            details: `NASA Earth Observatory event. Category: ${e.categories?.[0]?.title || "Unknown"}. Status: ${e.closed ? "closed" : "open"}.`,
            timestamp: geom.date,
            sourceLayer: "news",
          });
        });
      }

      if (quakeData?.features) {
        quakeData.features.forEach((f: any) => {
          const [lng, lat, depth] = f.geometry.coordinates;
          const mag = f.properties.mag;
          const type = f.properties.type;
          const shallow = type === "earthquake" && depth < 5 && mag > 3;
          pushIfInRegion({
            id: `quake-${f.id}`,
            type: "conflict",
            lat,
            lng,
            label: `${shallow ? "Shallow seismic" : "Seismic"} M${mag} ${f.properties.place}`,
            intensity: Math.min(Math.abs(mag || 0.1) / 8, 1),
            details: `${type}. Magnitude ${mag}. Depth ${depth} km. Time ${new Date(f.properties.time).toUTCString()}.`,
            timestamp: new Date(f.properties.time).toISOString(),
            sourceLayer: "earthquakes",
          });
        });
      }

      if (conflictData?.features) {
        conflictData.features.slice(0, 50).forEach((f: any, i: number) => {
          const coords = f.geometry?.coordinates;
          if (!coords) return;
          pushIfInRegion({
            id: `gdelt-${i}`,
            type: "conflict",
            lat: coords[1],
            lng: coords[0],
            label: `GDELT: ${f.properties?.name || "Conflict event"}`,
            intensity: 0.7,
            details: `GDELT conflict/event signal. ${f.properties?.htmlurl ? `Source: ${f.properties.htmlurl}` : "Real-time event tracking."}`,
            timestamp: new Date().toISOString(),
            sourceLayer: "conflictEvents",
          });
        });
      }

      if (unrestData?.features) {
        unrestData.features.slice(0, 50).forEach((f: any, i: number) => {
          const coords = f.geometry?.coordinates;
          if (!coords) return;
          pushIfInRegion({
            id: `unrest-${i}`,
            type: "conflict",
            lat: coords[1],
            lng: coords[0],
            label: `Civil unrest: ${f.properties?.name || "Protest/riot signal"}`,
            intensity: 0.62,
            details: `GDELT civil disturbance signal. ${f.properties?.htmlurl ? `Source: ${f.properties.htmlurl}` : "Global news-derived event."}`,
            timestamp: new Date().toISOString(),
            sourceLayer: "civilUnrest",
          });
        });
      }

      if (firmsData) {
        firmsData.split("\n").slice(1, 120).forEach((line: string, i: number) => {
          const cols = line.split(",");
          const lat = parseFloat(cols[0]);
          const lng = parseFloat(cols[1]);
          const brightness = parseFloat(cols[2]);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            pushIfInRegion({
              id: `firms-${i}`,
              type: "news",
              lat,
              lng,
              label: `Active fire ${Math.round(brightness)}K`,
              intensity: Math.min(brightness / 400, 1),
              details: `NASA FIRMS active fire. Brightness: ${brightness}K. Satellite: VIIRS.`,
              timestamp: new Date().toISOString(),
              sourceLayer: "fires",
            });
          }
        });
      }

      if (satData?.above) {
        satData.above.forEach((s: any) => {
          const prev = events.find((e) => e.id === `n2yo-${s.satid}`);
          pushIfInRegion({
            id: `n2yo-${s.satid}`,
            type: "satellite",
            lat: s.satlat,
            lng: s.satlng,
            label: s.satname,
            intensity: 0.25,
            details: `Satellite ${s.satname}. NORAD: ${s.satid}. Alt: ${Math.round(s.satalt)} km.`,
            timestamp: new Date().toISOString(),
            path: prev?.path ? [...prev.path.slice(-10), [s.satlat, s.satlng]] as [number, number][] : [[s.satlat, s.satlng]],
            sourceLayer: "satellites",
          });
        });
      }

      if (jammingData?.jams) {
        jammingData.jams.forEach((j: any, i: number) => {
          if (!j.lat || !j.lon) return;
          pushIfInRegion({
            id: `jam-${i}`,
            type: "conflict",
            lat: j.lat,
            lng: j.lon,
            label: `GPS interference ${j.location || "unknown"}`,
            intensity: 0.8,
            details: `GPS jamming/spoofing indicator. Location: ${j.location || "Unknown"}. Level: ${j.level || "reported"}.`,
            timestamp: new Date().toISOString(),
            sourceLayer: "jamming",
          });
        });
      }

      if (blackoutData?.data) {
        blackoutData.data.slice(0, 30).forEach((b: any, i: number) => {
          const lat = b.location?.latitude;
          const lng = b.location?.longitude;
          if (!lat || !lng) return;
          pushIfInRegion({
            id: `blackout-${i}`,
            type: "conflict",
            lat,
            lng,
            label: `Internet outage: ${b.entity?.name || "Unknown"}`,
            intensity: 0.55,
            details: `IODA outage alert. Entity: ${b.entity?.name || "Unknown"}. Country: ${b.location?.country || "Unknown"}.`,
            timestamp: new Date().toISOString(),
            sourceLayer: "internetOutages",
          });
        });
      }

      setEvents([...scrapedEvents, ...Array.from(liveAircraftRef.current.values()), ...Array.from(liveShipsRef.current.values())]);
      addLog(`Fusion complete: ${scrapedEvents.length} nodes`);
      saveEventsToHistory(scrapedEvents);
    } catch (err) {
      addLog("Fusion failed: check API config");
    }
  }, [addLog, events, region, regionKey]);

  const toggleLayer = (key: MapLayerKey) => {
    setLayers((prev) => {
      const enabled = !prev[key];
      if (enabled && OSM_LAYER_KEYS.includes(key)) fetchOsmLayer(key);
      if (enabled && key === "militaryAviation") fetchAircraftFeed("militaryAviation");
      if (enabled && key === "aviation") fetchAircraftFeed("aviation");
      if (enabled && layerMeta[key].note) addLog(`${layerMeta[key].label}: ${layerMeta[key].note}`);
      return { ...prev, [key]: enabled };
    });
  };

  const allEvents = useMemo(() => [...events, ...layerEvents], [events, layerEvents]);
  const filteredEvents = useMemo(() => allEvents.filter((event) => {
    if (!regionContains(region, event.lat, event.lng)) return false;
    return layers[inferLayer(event)];
  }), [allEvents, layers, region]);
  const displayedEvents = historicalEvents ?? filteredEvents;

  const playAlarm = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 740;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (err) {}
  };

  const handleAnalyze = async (isManual = true) => {
    setIsAnalyzing(isManual);
    if (isManual) {
      setAnalysis(null);
      setSelectedEvent(null);
    }
    const steps = ["Preparing data", "Loading imagery context", "Fusing live layers", "Writing assessment"];
    if (isManual) {
      for (const step of steps) {
        setAnalysisStatus(step);
        addLog(step);
        await new Promise((r) => setTimeout(r, 450));
      }
    }
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intelligenceData: selectedEvent || displayedEvents.slice(0, 60), region: region.label }),
      });
      if (response.status === 429) {
        addLog("Analysis throttled");
        return;
      }
      const result = await response.json();
      setAnalysis({ ...result, timestamp: new Date().toISOString() });
      if (!isManual && result.threat_score > 40) {
        setAlerts((prev) => [{ id: Date.now().toString(), msg: result.summary, score: result.threat_score }, ...prev].slice(0, 5));
        playAlarm();
      }
      addLog("Analysis complete");
    } catch (err) {
      addLog("AI analysis error");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus("");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("ophanim_demo_access");
    setDemoAccess(false);
    await supabase.auth.signOut();
    addLog("Session ended");
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session && !demoAccess) return;
    liveAircraftRef.current.clear();
    liveShipsRef.current.clear();
    setLayerEvents([]);
    fetchIntel();
    if (layers.aviation) fetchAircraftFeed("aviation");
    if (layers.militaryAviation) fetchAircraftFeed("militaryAviation");
    OSM_LAYER_KEYS.filter((key) => layers[key]).forEach(fetchOsmLayer);

    const interval = setInterval(fetchIntel, 60000);
    const aircraftInterval = setInterval(() => {
      if (layers.aviation) fetchAircraftFeed("aviation");
      if (layers.militaryAviation) fetchAircraftFeed("militaryAviation");
    }, 20000);

    let ws: WebSocket | null = null;
    const aisKey = (import.meta as any).env.VITE_AISSTREAM_KEY;
    if (aisKey && layers.maritime) {
      try {
        ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
        ws.onopen = () => {
          const [[south, west], [north, east]] = region.bounds;
          ws?.send(JSON.stringify({ APIKey: aisKey, BoundingBoxes: [[[south, west], [north, east]]] }));
          addLog(`AIS stream connected: ${region.label}`);
        };
        ws.onmessage = (raw) => {
          try {
            const msg = JSON.parse(raw.data);
            const pos = msg.Message?.PositionReport;
            const meta = msg.MetaData;
            if (pos && meta && pos.Latitude && pos.Longitude) {
              const id = `ais-${meta.MMSI}`;
              const prev = liveShipsRef.current.get(id);
              const ship: IntelligenceEvent = {
                id,
                type: "vessel",
                lat: pos.Latitude,
                lng: pos.Longitude,
                label: meta.ShipName?.trim() || `VESSEL-${meta.MMSI}`,
                intensity: 0.42,
                details: `Live vessel. MMSI: ${meta.MMSI}. Speed: ${pos.SpeedOverGround} kt. Heading: ${pos.TrueHeading}. Course: ${pos.CourseOverGround}.`,
                timestamp: new Date().toISOString(),
                path: [...(prev?.path || []).slice(-20), [pos.Latitude, pos.Longitude]] as [number, number][],
                sourceLayer: "maritime",
              };
              liveShipsRef.current.set(id, ship);
              mergeLiveData();
            }
          } catch (err) {}
        };
        ws.onerror = () => addLog("AIS stream error");
        ws.onclose = () => addLog("AIS stream disconnected");
      } catch (err) {
        addLog("AIS stream failed");
      }
    }

    return () => {
      clearInterval(interval);
      clearInterval(aircraftInterval);
      ws?.close();
    };
  }, [session, demoAccess, regionKey]);

  useEffect(() => {
    if ((!session && !demoAccess) || !autoAnalysisActive) return;
    const interval = setInterval(() => {
      if (!isAnalyzing && displayedEvents.length > 0) handleAnalyze(false);
    }, 120000);
    return () => clearInterval(interval);
  }, [session, demoAccess, autoAnalysisActive, isAnalyzing, displayedEvents.length]);

  if (showIntro) {
    return (
      <div className="intro-screen">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="intro-card">
          <div className="intro-card__eyebrow">OPHANIM V1</div>
          <h1>Global intelligence map</h1>
          <p>Live feeds need stable network access. Past data can take time to load.</p>
          <button
            onClick={() => {
              localStorage.setItem("ophanim_intro_seen", "true");
              setShowIntro(false);
            }}
          >
            Enter workspace
          </button>
        </motion.div>
      </div>
    );
  }

  if (!session && !demoAccess) {
    return <Auth onSuccess={() => { localStorage.setItem("ophanim_demo_access", "true"); setDemoAccess(true); }} />;
  }

  return (
    <div className="app-shell">
      <aside className="left-panel" style={{ width: sidebarWidth }}>
        <div onMouseDown={startResize} className="resize-handle" />
        <div className="brand-row">
          <div className="brand-mark"><Shield className="w-5 h-5" /></div>
          <div>
            <div className="brand-title">OPHANIM V1</div>
            <div className="brand-subtitle">Global OSINT operations</div>
          </div>
          <span className="live-chip">LIVE</span>
        </div>

        <div className="region-block">
          <label>Region</label>
          <div className="region-grid">
            {(Object.keys(REGION_PRESETS) as RegionKey[]).map((key) => (
              <button key={key} onClick={() => setRegionKey(key)} className={regionKey === key ? "region-button is-active" : "region-button"}>
                {REGION_PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className="tab-row">
          <button onClick={() => setActiveTab("layers")} className={activeTab === "layers" ? "is-active" : ""}><Layers className="w-4 h-4" />Layers</button>
          <button onClick={() => setActiveTab("news")} className={activeTab === "news" ? "is-active" : ""}><Newspaper className="w-4 h-4" />News</button>
          <button onClick={() => setActiveTab("memory")} className={activeTab === "memory" ? "is-active" : ""}><BrainCircuit className="w-4 h-4" />Memory</button>
        </div>

        <div className="panel-scroll">
          <AnimatePresence mode="wait">
            {activeTab === "layers" && (
              <motion.div key="layers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="action-row">
                  <button onClick={() => { fetchIntel(); fetchAircraftFeed("aviation"); fetchAircraftFeed("militaryAviation"); }} className="primary-action">
                    <RefreshCw className={cn("w-4 h-4", isAnalyzing && "animate-spin")} /> Sync
                  </button>
                  <label className="secondary-action">
                    <Upload className={cn("w-4 h-4", isImporting && "animate-bounce")} /> Import
                    <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleCSVImport(e.target.files[0])} />
                  </label>
                </div>

                {layerGroups.map((group) => (
                  <section key={group.title} className="layer-group">
                    <div className="layer-group__title">{group.title}</div>
                    {group.keys.map((key) => {
                      const meta = layerMeta[key];
                      const Icon = meta.icon;
                      const active = layers[key];
                      return (
                        <button key={key} onClick={() => toggleLayer(key)} className={active ? "layer-row is-active" : "layer-row"}>
                          <Icon className="w-4 h-4" />
                          <span className="layer-row__label">{meta.label}</span>
                          <span className="layer-row__source">{loadingLayers.has(key) ? "Loading" : meta.source}</span>
                        </button>
                      );
                    })}
                  </section>
                ))}

                {selectedEvent && (
                  <section className="selected-card">
                    <div className="selected-card__meta">{selectedEvent.type} / {inferLayer(selectedEvent)}</div>
                    <h3>{selectedEvent.label}</h3>
                    <div className="coord-grid">
                      <span>{selectedEvent.lat.toFixed(4)}</span>
                      <span>{selectedEvent.lng.toFixed(4)}</span>
                    </div>
                  </section>
                )}
              </motion.div>
            )}

            {activeTab === "news" && (
              <motion.div key="news" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="news-list">
                {news.length === 0 && <div className="empty-list">No news feed yet</div>}
                {news.map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noreferrer" className="news-card">
                    <span>{item.source.name} / {new Date(item.publishedAt).toLocaleDateString()}</span>
                    <strong>{item.title}</strong>
                  </a>
                ))}
              </motion.div>
            )}

            {activeTab === "memory" && (
              <motion.div key="memory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="memory-list">
                {cognition.map((lesson) => (
                  <article key={lesson.id} className="memory-card">
                    <strong>{lesson.title}</strong>
                    <p>{lesson.lesson}</p>
                    <span>{lesson.context}</span>
                  </article>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <section className="log-panel">
          <div className="log-panel__title"><Database className="w-3.5 h-3.5" /> System log</div>
          <div className="log-panel__body">
            {logs.map((log, i) => <div key={i}><span>{new Date().toLocaleTimeString()}</span> {log}</div>)}
          </div>
        </section>
      </aside>

      <main className="workspace">
        <header className="top-bar">
          <div>
            <div className="top-bar__title">{region.label} operating picture</div>
            <div className="top-bar__meta">{displayedEvents.length} plotted / {Object.values(layers).filter(Boolean).length} layers active</div>
          </div>
          <div className="top-bar__actions">
            <button onClick={() => handleAnalyze(true)} disabled={isAnalyzing} className="analysis-button">
              {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              {isAnalyzing ? analysisStatus || "Analyzing" : "Run analysis"}
            </button>
            <button onClick={() => setAutoAnalysisActive((v) => !v)} className={autoAnalysisActive ? "outline-button is-active" : "outline-button"}>
              Auto {autoAnalysisActive ? "on" : "off"}
            </button>
            <button onClick={handleLogout} className="icon-button" title="Log out"><LogOut className="w-4 h-4" /></button>
          </div>
        </header>

        <div className="map-stage">
          <IntelMap
            apiBase={API_BASE}
            events={displayedEvents}
            selectedEvent={selectedEvent}
            onEventClick={setSelectedEvent}
            region={region}
            showBorders={layers.borders}
          />
          <TimeMachine onHistoricalData={setHistoricalEvents} isLive={isLive} setIsLive={setIsLive} />
        </div>
      </main>

      <AnimatePresence>
        {(selectedEvent || analysis || isAnalyzing) && (
          <motion.aside initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} className="right-panel">
            <div className="right-panel__header">
              <div><Search className="w-4 h-4" /> Inspector</div>
              <button onClick={() => { setSelectedEvent(null); setAnalysis(null); }} className="icon-button small">x</button>
            </div>
            <div className="right-panel__body">
              {selectedEvent && (
                <section className="inspector-section">
                  <span className="section-kicker">{selectedEvent.id}</span>
                  <h2>{selectedEvent.label}</h2>
                  <div className="metric-grid">
                    <div><span>Latitude</span><strong>{selectedEvent.lat.toFixed(5)}</strong></div>
                    <div><span>Longitude</span><strong>{selectedEvent.lng.toFixed(5)}</strong></div>
                    <div><span>Layer</span><strong>{layerMeta[inferLayer(selectedEvent)].label}</strong></div>
                    <div><span>Signal</span><strong>{Math.round(selectedEvent.intensity * 100)}%</strong></div>
                  </div>
                  <p className="detail-box">{selectedEvent.details}</p>
                </section>
              )}

              {isAnalyzing && (
                <section className="analysis-loading">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <div>{analysisStatus || "Analyzing current picture"}</div>
                </section>
              )}

              {analysis && (
                <section className="analysis-card">
                  <span className="section-kicker">Assessment</span>
                  <div className="score-row">
                    <strong>{analysis.threat_score}%</strong>
                    <span>Threat score</span>
                  </div>
                  <p>{analysis.summary}</p>
                  <div className="evidence-list">
                    {(analysis.evidence || []).map((ev, i) => <div key={i}>{ev}</div>)}
                  </div>
                  <div className="recommendation">{analysis.recommendation || "Continue monitoring"}</div>
                </section>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="alert-stack">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.button
              key={alert.id}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              onClick={() => setAlerts((prev) => prev.filter((item) => item.id !== alert.id))}
              className="alert-card"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{alert.score}%</span>
              <p>{alert.msg}</p>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}


