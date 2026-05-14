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
import PreFlightCheck from "./components/PreFlightCheck";
import OperatorBriefing from "./components/OperatorBriefing";

import { supabase } from "./lib/supabase";
import { REGION_PRESETS, RegionKey, regionContains } from "./geo";
import { AnalysisResult, CognitionLesson, IntelligenceEvent, NewsItem } from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = (import.meta as any).env.VITE_API_URL || "";

type MapLayerKey = /* ... your existing types ... */ 
  | "militaryAviation" | "aviation" | "maritime" | "cameras" | "nuclear" | "satellites"
  | "cables" | "borders" | "osmSearch" | "militaryBases" | "embassies" | "volcanoes"
  | "seaports" | "lighthouses" | "spaceports" | "iranWarLive" | "civilUnrest"
  | "conflictEvents" | "earthquakes" | "airports" | "sanctions" | "news" | "fires"
  | "jamming" | "internetOutages";

type MapLayers = Record<MapLayerKey, boolean>;

// Keep all your existing constants (defaultLayers, layerMeta, layerGroups, seedCognition, inferLayer)
const OSM_LAYER_KEYS: MapLayerKey[] = [ /* ... your list ... */ ];

const defaultLayers: MapLayers = { /* ... your defaultLayers ... */ };

const layerMeta: Record<MapLayerKey, { label: string; source: string; icon: LucideIcon; note?: string }> = { /* ... your layerMeta ... */ };

const layerGroups: { title: string; keys: MapLayerKey[] }[] = [ /* ... your layerGroups ... */ ];

const seedCognition: CognitionLesson[] = [ /* ... your seedCognition ... */ ];

function inferLayer(event: IntelligenceEvent): MapLayerKey {
  // ... your existing inferLayer function ...
}

export default function App() {
  // ────── Core State ──────
  const [session, setSession] = useState<any>(null);
  const [demoAccess, setDemoAccess] = useState(() => localStorage.getItem("ophanim_demo_access") === "true");

  // V2 Screens
  const [showPreFlight, setShowPreFlight] = useState(() => localStorage.getItem("ophanim_preflight_seen") !== "true");
  const [showBriefing, setShowBriefing] = useState(() => localStorage.getItem("ophanim_briefing_seen") !== "true");

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
  const [logs, setLogs] = useState<string[]>(["OPHANIM-V2 initialized"]);
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

  // ────── Resize Handler ──────
  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (isResizing.current) {
        setSidebarWidth(Math.min(560, Math.max(280, startWidth + ev.clientX - startX)));
      }
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
      const staticEvents = prev.filter((e) => 
        !e.id.startsWith("opensky-") && 
        !e.id.startsWith("miladsb-") && 
        !e.id.startsWith("ais-")
      );
      return [...staticEvents, ...Array.from(liveAircraftRef.current.values()), ...Array.from(liveShipsRef.current.values())];
    });
  }, []);

  // ────── Fixed fetchIntel ──────
  const fetchIntel = useCallback(async () => {
    addLog(`Polling ${region.label}`);
    try {
      const query = `region=${regionKey}`;
      const responses = await Promise.all([
        fetch(`${API_BASE}/api/data?feed=news&${query}`),
        fetch(`${API_BASE}/api/data?feed=cognition`),
        fetch(`${API_BASE}/api/data?feed=nasa`),
        fetch(`${API_BASE}/api/data?feed=earthquakes&${query}`),
        fetch(`${API_BASE}/api/data?feed=conflicts&${query}`),
        fetch(`${API_BASE}/api/data?feed=civil-unrest&${query}`),
        fetch(`${API_BASE}/api/data?feed=firms&${query}`),
        fetch(`${API_BASE}/api/data?feed=satellites&${query}`),
        fetch(`${API_BASE}/api/data?feed=jamming&${query}`),
        fetch(`${API_BASE}/api/data?feed=blackouts&${query}`),
      ].map(p => p.catch(() => null)));

      const [newsData, cogData, nasaData, quakeData, conflictData, unrestData, firmsData, satData, jammingData, blackoutData] =
        await Promise.all(responses.map(r => r?.ok ? r.json().catch(() => null) : null));

      if (newsData?.articles) setNews(newsData.articles);
      if (Array.isArray(cogData) && cogData.length > 0) setCognition(cogData);

      const scrapedEvents: IntelligenceEvent[] = [];
      const pushIfInRegion = (event: IntelligenceEvent) => {
        if (regionContains(region, event.lat, event.lng)) scrapedEvents.push(event);
      };

      // ... (keep all your data processing logic for quake, conflict, unrest, firms, etc.) ...

      // Improved satellite handling
      if (satData?.above) {
        satData.above.forEach((s: any) => {
          const prev = [...events, ...layerEvents].find((e) => e.id === `n2yo-${s.satid}`);
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

      // ... rest of your jamming, blackout, etc. processing ...

      setEvents((prev) => {
        const staticEvents = prev.filter((e) => 
          !e.id.startsWith("opensky-") && !e.id.startsWith("miladsb-") && !e.id.startsWith("ais-")
        );
        return [...scrapedEvents, ...staticEvents, ...Array.from(liveAircraftRef.current.values()), ...Array.from(liveShipsRef.current.values())];
      });

      addLog(`Fusion complete: ${scrapedEvents.length} nodes`);
    } catch (err) {
      addLog("Fusion failed: check API config");
      console.error(err);
    }
  }, [addLog, regionKey, region, events, layerEvents]);

  // Rest of your functions (toggleLayer, handleCSVImport, fetchAircraftFeed, etc.) remain mostly the same

  // ... (I'll keep this response clean — the main fixes are above)

  // ────── V2 Screens ──────
  if (showPreFlight) {
    return <PreFlightCheck onAcknowledge={() => {
      localStorage.setItem("ophanim_preflight_seen", "true");
      setShowPreFlight(false);
    }} />;
  }

  if (showBriefing) {
    return <OperatorBriefing onAcknowledge={() => {
      localStorage.setItem("ophanim_briefing_seen", "true");
      setShowBriefing(false);
    }} />;
  }

  if (!session && !demoAccess) {
    return <Auth onSuccess={() => {
      localStorage.setItem("ophanim_demo_access", "true");
      setDemoAccess(true);
    }} />;
  }

  return (
    <div className="app-shell">
      <aside className="left-panel" style={{ width: sidebarWidth }}>
        <div onMouseDown={startResize} className="resize-handle" />
        <div className="brand-row">
          <div className="brand-mark"><Shield className="w-5 h-5" /></div>
          <div>
            <div className="brand-title">OPHANIM <span className="text-cyan-400">V2</span></div>
            <div className="brand-subtitle">Autonomous Intelligence Proxy</div>
          </div>
          <span className="live-chip">LIVE</span>
        </div>

        {/* Rest of your sidebar (region, tabs, layers, etc.) remains the same */}
        {/* ... */}

      </aside>

      {/* Main content remains similar with V2 styling tweaks if needed */}
      {/* ... */}
    </div>
  );
}
