import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity, AlertTriangle, Layers, Shield, Cpu, Terminal,
  Crosshair, Globe, Newspaper, Database, BrainCircuit,
  RefreshCw, Search, Plane, Ship, Orbit, Zap, Flame, Radio,
  Wifi, ChevronDown, X, Clock, Bell, LogOut, Menu, ChevronUp,
  FileText, CheckCircle, AlertCircle, Info
} from "lucide-react";
import IntelMap from "./components/IntelMap";
import TimeMachine from "./components/TimeMachine";
import Auth from "./components/Auth";
import { IntelligenceEvent, AnalysisResult, CognitionLesson, NewsItem } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Papa from "papaparse";
import { supabase } from "./lib/supabase";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
const API_BASE = (import.meta as any).env.VITE_API_URL || "";

export type MapLayers = {
  aircraft: boolean; vessel: boolean; satellite: boolean;
  news: boolean; seismic: boolean; conflict: boolean; fire: boolean;
  jamming: boolean;
};

export type Region = {
  name: string;
  center: [number, number];
  zoom: number;
  bbox: [[number, number], [number, number]];
};

export const REGIONS: Record<string, Region> = {
  GLOBAL:   { name: "Global",   center: [20, 0],    zoom: 2, bbox: [[-90,-180],[90,180]] },
  MENA:     { name: "MENA",     center: [24, 50],   zoom: 5, bbox: [[10,25],[45,65]] },
  EUROPE:   { name: "Europe",   center: [52, 15],   zoom: 4, bbox: [[35,-10],[70,40]] },
  AMERICAS: { name: "Americas", center: [15, -80],  zoom: 3, bbox: [[-60,-140],[70,-30]] },
  ASIA:     { name: "Asia",     center: [30, 100],  zoom: 3, bbox: [[-10,60],[60,150]] },
  AFRICA:   { name: "Africa",   center: [0, 20],    zoom: 3, bbox: [[-35,-20],[38,55]] },
  OCEANIA:  { name: "Oceania",  center: [-25, 135], zoom: 4, bbox: [[-50,110],[0,180]] },
  ARCTIC:   { name: "Arctic",   center: [80, 0],    zoom: 3, bbox: [[60,-180],[90,180]] },
};

const THREAT_COLORS: Record<string, string> = {
  GREEN: "#22c55e", YELLOW: "#eab308", ORANGE: "#f97316", RED: "#ef4444", BLACK: "#a855f7"
};

// ── INTRO SCREENS ─────────────────────────────────────────────────────────────
function SystemRequirements({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 480, width: "100%", padding: 40, border: "1px solid #30363d", borderRadius: 12, background: "#161b22" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <Shield style={{ width: 20, height: 20, color: "#58a6ff" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#8b949e", letterSpacing: "0.08em" }}>OPHANIM V2 — PRE-FLIGHT CHECK</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#e6edf3", marginBottom: 8 }}>System Requirements</div>
        <div style={{ fontSize: 13, color: "#8b949e", marginBottom: 28 }}>Please confirm before entering the platform.</div>

        {[
          { icon: "🖥️", title: "Desktop or laptop required", sub: "Mobile devices not supported. Minimum 1280px width recommended." },
          { icon: "🚫", title: "Disable ad blockers", sub: "Live data streams (ADS-B, AIS, FIRMS) will be blocked by uBlock, AdBlock, Brave Shield." },
          { icon: "📡", title: "Stable internet connection", sub: "Real-time feeds require consistent bandwidth. VPN may interfere with some feeds." },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < 2 ? "1px solid #21262d" : "none" }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3", marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.5 }}>{item.sub}</div>
            </div>
          </div>
        ))}

        <button onClick={onContinue}
          style={{ width: "100%", marginTop: 28, padding: "12px 0", background: "#1f6feb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}>
          Acknowledged — Continue →
        </button>
        <div style={{ textAlign: "center", fontSize: 11, color: "#484f58", marginTop: 12 }}>By continuing you confirm system requirements are met.</div>
      </motion.div>
    </div>
  );
}

function OperatorBriefing({ onEnter }: { onEnter: () => void }) {
  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 520, width: "100%", padding: 40, border: "1px solid #30363d", borderRadius: 12, background: "#161b22" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3fb950" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>Operator Briefing</span>
        </div>

        {[
          { color: "#58a6ff", icon: "🗺️", title: "Region Selection", body: "Use the region dropdown in the top bar to switch between Global, MENA, Europe, Americas, Asia, Africa, Oceania, and Arctic views." },
          { color: "#3fb950", icon: "🔄", title: "Data Refresh", body: "Streams auto-refresh every 60 seconds. Click Refresh in the top bar to force an immediate update of all intelligence feeds." },
          { color: "#d29922", icon: "🚢 ✈️", title: "Live Ships & Flights", body: "AIS vessel data streams via WebSocket. ADS-B aircraft refresh every 15 seconds. Both are active automatically." },
          { color: "#a371f7", icon: "🛰️", title: "Overlay Panels", body: "GIBS satellite imagery, GPS jamming, and No-Fly Zone panels are draggable and resizable. Access them from the map controls." },
          { color: "#f85149", icon: "⚠️", title: "Threat Alerts", body: "AI threat score above 40% triggers an audio alert and popup notification. Auto-analysis runs every 2 minutes when enabled." },
          { color: "#8b949e", icon: "📋", title: "Disclaimer", body: "Research and educational purposes only. All data sourced from publicly available open-source feeds." },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < 5 ? "1px solid #21262d" : "none" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: item.color, marginBottom: 3, letterSpacing: "0.06em" }}>{item.title.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.5 }}>{item.body}</div>
            </div>
          </div>
        ))}

        <button onClick={onEnter}
          style={{ width: "100%", marginTop: 28, padding: "12px 0", background: "#1f6feb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Enter OPHANIM →
        </button>
      </motion.div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [demoAccess, setDemoAccess] = useState(() => localStorage.getItem("ophanim_demo_access") === "true");
  const [introStep, setIntroStep] = useState<"requirements" | "briefing" | "app">(
    localStorage.getItem("ophanim_intro_done") === "true" ? "app" : "requirements"
  );
  const [activeTab, setActiveTab] = useState<"layers" | "events" | "news" | "intel">("layers");
  const [activeRegion, setActiveRegion] = useState<string>("MENA");
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [logMinimized, setLogMinimized] = useState(false);
  const [layers, setLayers] = useState<MapLayers>({
    aircraft: true, vessel: true, satellite: true, news: true,
    seismic: true, conflict: true, fire: true, jamming: true
  });
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [cognition, setCognition] = useState<CognitionLesson[]>([
    { id: "seed-1", title: "Strait of Hormuz Chokepoint Doctrine", lesson: "Any vessel clustering near Qeshm Island or Abu Musa with AIS dark periods exceeding 2 hours should be treated as high-priority surveillance target. Iranian IRGCN doctrine relies on swarm tactics from these staging points.", context: "ATLAS Historical Intelligence — Persian Gulf Operations" },
    { id: "seed-2", title: "GPS Spoofing Signature — MENA", lesson: "GPS spoofing events in the eastern Mediterranean and Persian Gulf typically precede kinetic action by 24-72 hours. Vessels reporting impossible positions indicate active EW operations.", context: "ATLAS Electronic Warfare Analysis" },
    { id: "seed-3", title: "Houthi Missile Launch Seismic Signature", lesson: "Ballistic missile launches from Yemen generate shallow seismic events (depth < 2km) with magnitude 1.5-2.5. Cross-reference with ADS-B gaps and news events for confirmation.", context: "ATLAS Yemen Operations Database" },
    { id: "seed-4", title: "Red Sea Shipping Lane Threat Assessment", lesson: "Vessels transiting Bab el-Mandeb should maintain AIS broadcast and avoid night transit when threat level is ORANGE or above. Historical pattern shows Houthi attacks peak 2200-0200 local time.", context: "ATLAS Maritime Security — Red Sea" },
    { id: "seed-5", title: "Israeli Air Operations Signature", lesson: "IAF strikes are typically preceded by increased UAV activity over Lebanon/Syria and GPS jamming expanding from northern Israel. ADS-B squawk 7600 clusters indicate comms disruption.", context: "ATLAS OSINT — Levant Operations" },
  ]);
  const [selectedEvent, setSelectedEvent] = useState<IntelligenceEvent | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoAnalysisActive, setAutoAnalysisActive] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [alerts, setAlerts] = useState<{id: string, msg: string, score: number}[]>([]);
  const [logs, setLogs] = useState<string[]>(["OPHANIM V2 — System initialised"]);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [isLive, setIsLive] = useState(true);
  const [historicalEvents, setHistoricalEvents] = useState<IntelligenceEvent[] | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [threatLevel, setThreatLevel] = useState<string>("GREEN");
  const [threatScore, setThreatScore] = useState<number>(0);
  const liveAircraftRef = useRef<Map<string, IntelligenceEvent>>(new Map());
  const liveShipsRef = useRef<Map<string, IntelligenceEvent>>(new Map());

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));

  const playAlarm = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      [880, 660, 880, 440].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.12);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.12);
      });
    } catch (e) {}
  };

  const handleCSVImport = (file: File) => {
    setIsImporting(true);
    addLog(`Importing CSV: ${file.name}`);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        const imported: IntelligenceEvent[] = (results.data as any[]).map((row, i) => ({
          id: row.id || `csv-${Date.now()}-${i}`,
          type: (['vessel','aircraft','conflict','news','satellite'].includes(row.type) ? row.type : 'news') as any,
          lat: parseFloat(row.lat || row.latitude || 0),
          lng: parseFloat(row.lng || row.longitude || row.lon || 0),
          label: row.label || row.title || row.name || "Unknown",
          intensity: parseFloat(row.intensity || row.severity || 0.5),
          details: row.details || row.description || "Imported event.",
          timestamp: row.timestamp || new Date().toISOString(),
        })).filter(e => !isNaN(e.lat) && !isNaN(e.lng) && e.lat !== 0);
        if (imported.length > 0) {
          setEvents(prev => [...prev, ...imported]);
          addLog(`CSV import successful — ${imported.length} events merged`);
        } else {
          addLog("CSV import — no valid coordinates found. Ensure columns: lat, lng, type, label");
        }
        setIsImporting(false);
      },
      error: (err) => { addLog(`CSV import failed: ${err.message}`); setIsImporting(false); }
    });
  };

  const saveEventsToHistory = async (eventsToSave: IntelligenceEvent[]) => {
    if (eventsToSave.length === 0) return;
    const rows = eventsToSave.filter(e => e.lat && e.lng).slice(0, 100).map(e => ({
      asset_id: e.id, asset_type: e.type, lat: e.lat, lng: e.lng,
      label: e.label, intensity: e.intensity, details: e.details,
      recorded_at: new Date().toISOString(),
    }));
    try {
      const { error } = await supabase.from('event_history').insert(rows);
      if (error) console.error('History save error:', error);
    } catch(err) { console.warn('History save failed:', err); }
  };

  const mergeLiveData = () => {
    setEvents(prev => {
      const statics = prev.filter(e => !e.id.startsWith('adsb-') && !e.id.startsWith('ais-'));
      return [...statics, ...Array.from(liveAircraftRef.current.values()), ...Array.from(liveShipsRef.current.values())];
    });
  };

  const fetchAircraft = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/aircraft`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.ac?.length > 0) {
        let milCount = 0;
        data.ac.filter((a: any) => a.lat && a.lon).forEach((a: any) => {
          const isMilitary = a.t?.includes('MIL') ||
            ['RCH','DUKE','FORTE','LAGR','HOMER','USAF','UAF','JAKE','ROCKY','KING','REACH','TOPGN'].some(p => a.flight?.startsWith(p)) ||
            ['7700','7600','7500'].includes(a.squawk);
          if (isMilitary) milCount++;
          const event: IntelligenceEvent = {
            id: "adsb-" + a.hex, type: "aircraft",
            lat: a.lat, lng: a.lon,
            label: isMilitary ? `MIL: ${a.flight?.trim() || a.hex}` : (a.flight?.trim() || a.hex || "Unknown"),
            intensity: isMilitary ? 0.9 : 0.3,
            details: `${isMilitary ? 'Military Aircraft' : 'Civil'}: ${a.flight?.trim() || 'Unknown'}. Alt: ${a.alt_baro || '?'}ft. Speed: ${a.gs || '?'}kts. Squawk: ${a.squawk || 'None'}.`,
            timestamp: new Date().toISOString(),
            path: (liveAircraftRef.current.get("adsb-" + a.hex)?.path || []).slice(-20).concat([[a.lat, a.lon]]) as [number,number][]
          };
          liveAircraftRef.current.set(event.id, event);
        });
        mergeLiveData();
        addLog(`ADS-B: ${data.ac.filter((a:any) => a.lat).length} aircraft tracked (${milCount} military)`);
      }
    } catch (e) { addLog("ADS-B feed unavailable"); }
  };

  const fetchIntel = async () => {
    addLog("Polling all intelligence streams...");
    try {
      const [newsRes, cogRes, nasaRes, quakeRes, conflictRes, firmsRes, satRes, jammingRes, blackoutRes] = await Promise.all([
        fetch(`${API_BASE}/api/news`).catch(() => null),
        fetch(`${API_BASE}/api/cognition`).catch(() => null),
        fetch(`${API_BASE}/api/nasa`).catch(() => null),
        fetch(`${API_BASE}/api/earthquakes`).catch(() => null),
        fetch(`${API_BASE}/api/conflicts`).catch(() => null),
        fetch(`${API_BASE}/api/firms`).catch(() => null),
        fetch(`${API_BASE}/api/satellites`).catch(() => null),
        fetch(`${API_BASE}/api/jamming`).catch(() => null),
        fetch(`${API_BASE}/api/blackouts`).catch(() => null),
      ]);
      const [newsData, cogData, nasaData, quakeData, conflictData, firmsData, satData, jammingData, blackoutData] = await Promise.all([
        newsRes?.ok ? newsRes.json() : null,
        cogRes?.ok ? cogRes.json() : null,
        nasaRes?.ok ? nasaRes.json() : null,
        quakeRes?.ok ? quakeRes.json() : null,
        conflictRes?.ok ? conflictRes.json() : null,
        firmsRes?.ok ? firmsRes.text() : null,
        satRes?.ok ? satRes.json() : null,
        jammingRes?.ok ? jammingRes.json() : null,
        blackoutRes?.ok ? blackoutRes.json() : null,
      ]);

      if (newsData?.articles) setNews(newsData.articles);
      if (cogData?.length > 0) setCognition(cogData);

      const scrapedEvents: IntelligenceEvent[] = [];

      if (nasaData?.events) {
        nasaData.events.forEach((e: any) => {
          if (e.geometry?.[0]) {
            scrapedEvents.push({ id: "nasa-" + e.id, type: "news", lat: e.geometry[0].coordinates[1], lng: e.geometry[0].coordinates[0], label: "EONET: " + e.title, intensity: 0.5, details: `NASA EONET: ${e.title}. Category: ${e.categories?.[0]?.title || 'Unknown'}.`, timestamp: e.geometry[0].date });
          }
        });
        addLog(`EONET: ${nasaData.events.length} environmental events`);
      }

      if (quakeData?.features) {
        quakeData.features.forEach((f: any) => {
          const [lng, lat] = f.geometry.coordinates;
          const mag = f.properties.mag;
          const place = f.properties.place;
          const type = f.properties.type;
          const isExplosion = ['explosion','quarry blast','nuclear explosion'].includes(type);
          const isMissile = mag > 3.0 && type === 'earthquake' && f.geometry.coordinates[2] < 5;
          scrapedEvents.push({ id: "quake-" + f.id, type: "conflict", lat, lng, label: isExplosion ? `Explosion M${mag} — ${place}` : isMissile ? `Shallow Seismic M${mag} — ${place}` : `Seismic M${mag} — ${place}`, intensity: Math.min(Math.abs(mag || 0.1) / 8, 1.0), details: `${isExplosion ? 'Explosion detected' : isMissile ? 'Possible strike — shallow depth' : 'Seismic event'}: M${mag}. ${place}. Depth: ${f.geometry.coordinates[2]}km.`, timestamp: new Date(f.properties.time).toISOString() });
        });
        addLog(`Seismic: ${quakeData.features.length} events (global)`);
      }

      if (conflictData?.features) {
        conflictData.features.slice(0, 20).forEach((f: any, i: number) => {
          if (f.geometry?.coordinates) {
            scrapedEvents.push({ id: "gdelt-" + i, type: "conflict", lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], label: "GDELT: " + (f.properties?.name || "Conflict event"), intensity: 0.7, details: `GDELT conflict event detected. ${f.properties?.htmlurl || ''}`, timestamp: new Date().toISOString() });
          }
        });
        addLog(`GDELT: ${Math.min(conflictData.features?.length || 0, 20)} conflict nodes`);
      }

      if (firmsData) {
        firmsData.split('\n').slice(1, 20).forEach((line: string, i: number) => {
          const cols = line.split(',');
          if (cols.length > 3) {
            const lat = parseFloat(cols[0]), lng = parseFloat(cols[1]), brightness = parseFloat(cols[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
              scrapedEvents.push({ id: "firms-" + i, type: "news", lat, lng, label: `Active fire — ${brightness}K`, intensity: Math.min(brightness / 400, 1.0), details: `NASA FIRMS fire. Brightness: ${brightness}K. Sensor: VIIRS.`, timestamp: new Date().toISOString() });
            }
          }
        });
        addLog(`FIRMS: Fire data synced`);
      }

      if (satData?.above?.length > 0) {
        satData.above.forEach((s: any) => {
          const prev = events.find(e => e.id === "n2yo-" + s.satid);
          scrapedEvents.push({ id: "n2yo-" + s.satid, type: "satellite", lat: s.satlat, lng: s.satlng, label: s.satname, intensity: 0.1, details: `Satellite: ${s.satname}. NORAD: ${s.satid}. Alt: ${Math.round(s.satalt)}km.`, timestamp: new Date().toISOString(), path: prev?.path ? [...prev.path.slice(-10), [s.satlat, s.satlng]] as [number,number][] : [[s.satlat, s.satlng]] });
        });
        addLog(`N2YO: ${satData.above.length} satellites tracked`);
      }

      if (jammingData?.jams) {
        jammingData.jams.forEach((j: any, i: number) => {
          if (j.lat && j.lon) scrapedEvents.push({ id: "jam-" + i, type: "conflict", lat: j.lat, lng: j.lon, label: `GPS jamming — ${j.location || 'Unknown'}`, intensity: 0.8, details: `GPS jamming detected. Location: ${j.location || 'Unknown'}. Level: ${j.level || 'High'}.`, timestamp: new Date().toISOString() });
        });
        addLog(`EW/Jamming: ${jammingData.jams.length} interference zones`);
      }

      if (blackoutData?.data) {
        blackoutData.data.slice(0, 5).forEach((b: any, i: number) => {
          if (b.location?.latitude && b.location?.longitude) scrapedEvents.push({ id: "blackout-" + i, type: "conflict", lat: b.location.latitude, lng: b.location.longitude, label: `Internet outage — ${b.entity?.name || 'Unknown'}`, intensity: 0.6, details: `Internet outage. Entity: ${b.entity?.name}. Country: ${b.location?.country}.`, timestamp: new Date().toISOString() });
        });
        addLog(`Blackouts: ${blackoutData.data.length} outages`);
      }

      setEvents(prev => {
        const live = [...Array.from(liveAircraftRef.current.values()), ...Array.from(liveShipsRef.current.values())];
        return [...scrapedEvents, ...live];
      });
      addLog(`Fusion complete — ${scrapedEvents.length} events synced`);
      saveEventsToHistory(scrapedEvents);
    } catch (err) { addLog("Intelligence fusion error"); console.error(err); }
  };

  const filteredEvents = events.filter(e => {
    if (e.type === "aircraft") return layers.aircraft;
    if (e.type === "vessel") return layers.vessel;
    if (e.type === "satellite") return layers.satellite;
    if (e.type === "news") return layers.news;
    if (e.type === "conflict") {
      if (e.id.startsWith('quake-')) return layers.seismic;
      if (e.id.startsWith('jam-') || e.id.startsWith('blackout-')) return layers.jamming;
      return layers.conflict;
    }
    return true;
  });

  useEffect(() => {
    if (events.length === 0) return;
    const interval = setInterval(() => {
      setEvents(prev => prev.map(event => {
        if (event.type === 'satellite') {
          const newPath = [...(event.path || []).slice(-20), [event.lat, event.lng]] as [number,number][];
          return { ...event, lat: event.lat + (Math.random()-0.5)*0.05, lng: event.lng + (Math.random()-0.3)*0.1, path: newPath };
        }
        return event;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [events.length]);

  const handleAnalyze = async (isManual: boolean = true) => {
    setIsAnalyzing(isManual);
    if (isManual) { setAnalysis(null); setDetailPanelOpen(true); }
    const steps = ["Initialising AI analyst...", "Fetching GIBS satellite imagery...", "Querying intelligence store...", "Fusing multi-domain data streams...", "Generating threat assessment..."];
    if (isManual) {
      for (const step of steps) { setAnalysisStatus(step); addLog(step); await new Promise(r => setTimeout(r, 700)); }
    }
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intelligenceData: selectedEvent || events.slice(0, 30) })
      });
      if (response.status === 429) { addLog("Rate limited — please wait"); setIsAnalyzing(false); setAnalysisStatus(""); return; }
      const result = await response.json();
      setAnalysis({ ...result, timestamp: new Date().toISOString() });
      setThreatLevel(result.threat_level || "GREEN");
      setThreatScore(result.threat_score || 0);
      setDetailPanelOpen(true);
      if (!isManual && result.threat_score > 40) {
        setAlerts(prev => [{ id: Date.now().toString(), msg: result.summary, score: result.threat_score }, ...prev].slice(0, 5));
        addLog(`ALERT — Threat score: ${result.threat_score}% (${result.threat_level})`);
        playAlarm();
      }
      addLog(isManual ? `Analysis complete — ${result.threat_level} / ${result.threat_score}%` : `Background scan — ${result.threat_level} / ${result.threat_score}%`);
    } catch (err) { addLog("Analysis error — check API configuration"); }
    finally { setIsAnalyzing(false); setAnalysisStatus(""); }
  };

  const handleLogout = async () => {
    localStorage.removeItem("ophanim_demo_access");
    setDemoAccess(false);
    await supabase.auth.signOut();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session && !demoAccess) return;
    fetchIntel(); fetchAircraft();
    const interval = setInterval(fetchIntel, 60000);
    const aircraftInterval = setInterval(fetchAircraft, 15000);
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
      ws.onopen = () => {
        const region = REGIONS[activeRegion];
        ws!.send(JSON.stringify({ APIKey: (import.meta as any).env.VITE_AISSTREAM_KEY, BoundingBoxes: [region.bbox] }));
        addLog("AIS vessel feed connected");
      };
      ws.onmessage = (raw) => {
        try {
          const msg = JSON.parse(raw.data);
          const pos = msg.Message?.PositionReport;
          const meta = msg.MetaData;
          if (pos && meta && pos.Latitude && pos.Longitude) {
            const prev = liveShipsRef.current.get("ais-" + meta.MMSI);
            const ship: IntelligenceEvent = { id: "ais-" + meta.MMSI, type: "vessel", lat: pos.Latitude, lng: pos.Longitude, label: meta.ShipName?.trim() || `Vessel ${meta.MMSI}`, intensity: 0.4, details: `${meta.ShipName?.trim() || 'Unknown'}. MMSI: ${meta.MMSI}. Speed: ${pos.SpeedOverGround}kn. Heading: ${pos.TrueHeading}°.`, timestamp: new Date().toISOString(), path: [...(prev?.path || []).slice(-20), [pos.Latitude, pos.Longitude]] as [number,number][] };
            liveShipsRef.current.set(ship.id, ship);
            mergeLiveData();
          }
        } catch (e) {}
      };
      ws.onerror = () => addLog("AIS feed connection error");
      ws.onclose = () => addLog("AIS feed disconnected");
    } catch (e) { addLog("AIS feed unavailable"); }
    return () => { clearInterval(interval); clearInterval(aircraftInterval); ws?.close(); };
  }, [session, demoAccess, activeRegion]);

  useEffect(() => {
    if ((!session && !demoAccess) || !autoAnalysisActive) return;
    const interval = setInterval(() => { if (!isAnalyzing && events.length > 0) handleAnalyze(false); }, 120000);
    return () => clearInterval(interval);
  }, [session, autoAnalysisActive, isAnalyzing, events.length]);

  // ── INTRO FLOW ─────────────────────────────────────────────────────────────
  if (introStep === "requirements") {
    return <SystemRequirements onContinue={() => setIntroStep("briefing")} />;
  }
  if (introStep === "briefing") {
    return <OperatorBriefing onEnter={() => { localStorage.setItem("ophanim_intro_done", "true"); setIntroStep("app"); }} />;
  }
  if (!session && !demoAccess) {
    return <Auth onSuccess={() => { localStorage.setItem("ophanim_demo_access", "true"); setDemoAccess(true); }} />;
  }

  const currentRegion = REGIONS[activeRegion];
  const tlColor = THREAT_COLORS[threatLevel] || "#22c55e";

  // ── MAIN LAYOUT ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden select-none" style={{ background: "#0d1117", color: "#e6edf3", fontFamily: "'Inter', 'SF Pro', system-ui, sans-serif" }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12"
        style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarCollapsed(p => !p)} className="p-1.5 rounded hover:bg-white/10 transition-colors">
            <Menu className="w-4 h-4" style={{ color: "#8b949e" }} />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: "#58a6ff" }} />
            <span className="font-semibold text-sm">OPHANIM</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#21262d", color: "#8b949e", border: "1px solid #30363d" }}>V2</span>
          </div>
          <div className="h-4 w-px" style={{ background: "#30363d" }} />
          {/* Region dropdown */}
          <div className="relative">
            <button onClick={() => setRegionDropdownOpen(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium hover:bg-white/10 transition-colors"
              style={{ border: "1px solid #30363d", color: "#58a6ff" }}>
              <Globe className="w-3.5 h-3.5" />
              {currentRegion.name}
              <ChevronDown className="w-3 h-3" />
            </button>
            {regionDropdownOpen && (
              <div className="absolute top-9 left-0 w-40 rounded-lg shadow-2xl z-50 overflow-hidden"
                style={{ background: "#161b22", border: "1px solid #30363d" }}>
                {Object.entries(REGIONS).map(([key, r]) => (
                  <button key={key} onClick={() => { setActiveRegion(key); setRegionDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors flex items-center justify-between"
                    style={{ color: activeRegion === key ? "#58a6ff" : "#e6edf3" }}>
                    {r.name}
                    {activeRegion === key && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Centre */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded text-xs"
            style={{ background: "#21262d", border: `1px solid ${tlColor}44` }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: tlColor }} />
            <span style={{ color: tlColor }} className="font-semibold">THREAT: {threatLevel}</span>
            {threatScore > 0 && <span style={{ color: "#8b949e" }}>· {threatScore}%</span>}
          </div>
          <div className="text-xs flex items-center gap-1.5" style={{ color: "#8b949e" }}>
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
            {isLive ? "LIVE" : "HISTORICAL"}
          </div>
          <div className="text-xs" style={{ color: "#8b949e" }}>{filteredEvents.length} events</div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ background: "#3d1515", border: "1px solid #f85149", color: "#f85149" }}>
              <Bell className="w-3 h-3" /> {alerts.length}
            </div>
          )}
          <button onClick={() => { fetchIntel(); fetchAircraft(); }}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs hover:bg-white/10 transition-colors"
            style={{ border: "1px solid #30363d", color: "#8b949e" }}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => setAutoAnalysisActive(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors"
            style={{ background: autoAnalysisActive ? "#1f6feb22" : "transparent", border: `1px solid ${autoAnalysisActive ? "#1f6feb" : "#30363d"}`, color: autoAnalysisActive ? "#58a6ff" : "#8b949e" }}>
            <Cpu className="w-3 h-3" />
            Auto-AI: {autoAnalysisActive ? "On" : "Off"}
          </button>
          <button onClick={handleLogout} className="p-1.5 rounded hover:bg-white/10 transition-colors" style={{ color: "#8b949e" }}>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── ALERTS ──────────────────────────────────────────────────────── */}
      <div className="absolute top-16 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div key={alert.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
              className="pointer-events-auto cursor-pointer rounded-lg p-4"
              style={{ background: "#161b22", border: "1px solid #f85149", boxShadow: "0 0 20px #f8514944" }}
              onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#f85149" }}>
                  <AlertTriangle className="w-3.5 h-3.5" /> Threat Detected
                </span>
                <span className="text-lg font-bold" style={{ color: "#f85149" }}>{alert.score}%</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#8b949e" }}>{alert.msg}</p>
              <p className="text-xs mt-1.5" style={{ color: "#30363d" }}>Click to dismiss</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col shrink-0 overflow-hidden mt-12"
            style={{ background: "#161b22", borderRight: "1px solid #30363d", width: 280 }}>

            {/* Tabs */}
            <div className="flex shrink-0" style={{ borderBottom: "1px solid #30363d" }}>
              {[
                { key: "layers", icon: <Layers className="w-3.5 h-3.5" />, label: "Layers" },
                { key: "events", icon: <Activity className="w-3.5 h-3.5" />, label: "Events" },
                { key: "news",   icon: <Newspaper className="w-3.5 h-3.5" />, label: "News" },
                { key: "intel",  icon: <BrainCircuit className="w-3.5 h-3.5" />, label: "Intel" },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors"
                  style={{ color: activeTab === tab.key ? "#58a6ff" : "#8b949e", borderBottom: activeTab === tab.key ? "2px solid #58a6ff" : "2px solid transparent" }}>
                  {tab.icon}
                  <span style={{ fontSize: 9 }}>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto min-h-0">

              {activeTab === "layers" && (
                <div className="p-3 space-y-1">
                  <div className="text-xs font-semibold mb-3 px-1" style={{ color: "#8b949e", letterSpacing: "0.08em" }}>DATA LAYERS</div>
                  {[
                    { key: 'aircraft', icon: <Plane className="w-3.5 h-3.5" />, label: 'Military & Civil Aviation', sub: 'ADS-B · OpenSky Network' },
                    { key: 'vessel',   icon: <Ship className="w-3.5 h-3.5" />,  label: 'Maritime Traffic', sub: 'AIS · AISStream WebSocket' },
                    { key: 'satellite',icon: <Orbit className="w-3.5 h-3.5" />, label: 'Satellite Tracking', sub: 'N2YO · LEO objects' },
                    { key: 'seismic',  icon: <Radio className="w-3.5 h-3.5" />, label: 'Seismic / Explosions', sub: 'USGS global feed' },
                    { key: 'conflict', icon: <Zap className="w-3.5 h-3.5" />,   label: 'Conflict Events', sub: 'GDELT real-time' },
                    { key: 'fire',     icon: <Flame className="w-3.5 h-3.5" />, label: 'Active Fires', sub: 'NASA FIRMS VIIRS' },
                    { key: 'jamming',  icon: <Wifi className="w-3.5 h-3.5" />,  label: 'GPS Jamming / EW', sub: 'GPSJam.org' },
                    { key: 'news',     icon: <Globe className="w-3.5 h-3.5" />, label: 'EONET Events', sub: 'NASA Earth Observatory' },
                  ].map(({ key, icon, label, sub }) => (
                    <button key={key} onClick={() => setLayers(l => ({ ...l, [key]: !l[key as keyof MapLayers] }))}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors hover:bg-white/5"
                      style={{ background: layers[key as keyof MapLayers] ? "#1f6feb15" : "transparent" }}>
                      <div className="shrink-0" style={{ color: layers[key as keyof MapLayers] ? "#58a6ff" : "#484f58" }}>{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium" style={{ color: layers[key as keyof MapLayers] ? "#e6edf3" : "#8b949e" }}>{label}</div>
                        <div style={{ color: "#484f58", fontSize: 10 }}>{sub}</div>
                      </div>
                      <div className="w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center"
                        style={{ borderColor: layers[key as keyof MapLayers] ? "#58a6ff" : "#30363d", background: layers[key as keyof MapLayers] ? "#58a6ff" : "transparent" }}>
                        {layers[key as keyof MapLayers] && <div className="w-1.5 h-1.5 rounded-sm bg-white" />}
                      </div>
                    </button>
                  ))}
                  <div className="border-t mt-4 pt-3" style={{ borderColor: "#30363d" }}>
                    <label className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-white/5 transition-colors">
                      <Database className="w-3.5 h-3.5 shrink-0" style={{ color: isImporting ? "#58a6ff" : "#8b949e" }} />
                      <div className="flex-1">
                        <div className="text-xs font-medium" style={{ color: "#e6edf3" }}>{isImporting ? "Importing..." : "Import CSV"}</div>
                        <div style={{ color: "#484f58", fontSize: 10 }}>Columns: lat, lng, type, label, intensity</div>
                      </div>
                      <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleCSVImport(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "events" && (
                <div className="p-3">
                  <div className="text-xs font-semibold mb-3 px-1 flex items-center gap-2" style={{ color: "#8b949e", letterSpacing: "0.08em" }}>
                    ACTIVE EVENTS
                    <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: "#21262d", color: "#58a6ff" }}>{filteredEvents.length}</span>
                  </div>
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-8 text-xs" style={{ color: "#484f58" }}>
                      <Activity className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      No events — data loading...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredEvents.slice(0, 50).map(event => (
                        <button key={event.id} onClick={() => { setSelectedEvent(event); setDetailPanelOpen(true); }}
                          className="w-full text-left px-3 py-2.5 rounded-md transition-colors hover:bg-white/5 flex items-start gap-2.5"
                          style={{ background: selectedEvent?.id === event.id ? "#1f6feb22" : "transparent", border: `1px solid ${selectedEvent?.id === event.id ? "#1f6feb44" : "transparent"}` }}>
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: event.type === 'aircraft' ? "#58a6ff" : event.type === 'vessel' ? "#3fb950" : event.type === 'satellite' ? "#a371f7" : event.intensity > 0.7 ? "#f85149" : "#d29922" }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate" style={{ color: "#e6edf3" }}>{event.label}</div>
                            <div style={{ color: "#8b949e", fontSize: 10 }}>{event.type} · {new Date(event.timestamp).toLocaleTimeString()}</div>
                          </div>
                          {event.intensity > 0.7 && <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0 mt-1.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "news" && (
                <div className="p-3 space-y-2">
                  <div className="text-xs font-semibold mb-3 px-1" style={{ color: "#8b949e", letterSpacing: "0.08em" }}>INTELLIGENCE NEWS</div>
                  {news.length === 0 ? (
                    <div className="text-center py-8 text-xs" style={{ color: "#484f58" }}>
                      <Newspaper className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      No news feeds active
                    </div>
                  ) : news.map((item, i) => (
                    <a key={i} href={item.url} target="_blank" rel="noreferrer"
                      className="block px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors"
                      style={{ border: "1px solid #21262d" }}>
                      <div style={{ color: "#8b949e", fontSize: 10, marginBottom: 4 }}>{item.source.name} · {new Date(item.publishedAt).toLocaleDateString()}</div>
                      <div className="text-xs font-medium leading-snug" style={{ color: "#e6edf3" }}>{item.title}</div>
                    </a>
                  ))}
                </div>
              )}

              {activeTab === "intel" && (
                <div className="p-3 space-y-2">
                  <div className="text-xs font-semibold mb-3 px-1" style={{ color: "#8b949e", letterSpacing: "0.08em" }}>INTELLIGENCE DOCTRINE</div>
                  {cognition.map(lesson => (
                    <div key={lesson.id} className="px-3 py-3 rounded-md" style={{ background: "#21262d", border: "1px solid #30363d" }}>
                      <div className="text-xs font-semibold mb-1.5" style={{ color: "#58a6ff" }}>{lesson.title}</div>
                      <div className="text-xs leading-relaxed" style={{ color: "#8b949e" }}>{lesson.lesson}</div>
                      <div style={{ color: "#484f58", fontSize: 10, marginTop: 6 }}>{lesson.context}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── SYSTEM LOG — minimizable ─────────────────────────────── */}
            <div className="shrink-0" style={{ borderTop: "1px solid #30363d" }}>
              <button onClick={() => setLogMinimized(p => !p)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3" style={{ color: "#484f58" }} />
                  <span style={{ color: "#484f58", fontSize: 11 }}>System log</span>
                </div>
                {logMinimized
                  ? <ChevronUp className="w-3 h-3" style={{ color: "#484f58" }} />
                  : <ChevronDown className="w-3 h-3" style={{ color: "#484f58" }} />}
              </button>
              {!logMinimized && (
                <div className="px-3 pb-3 max-h-32 overflow-y-auto space-y-0.5">
                  {logs.slice(0, 12).map((log, i) => (
                    <div key={i} style={{ color: "#484f58", fontSize: 10, lineHeight: 1.5 }}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAIN MAP ─────────────────────────────────────────────────────── */}
      <main className="flex-1 relative flex flex-col min-w-0 mt-12">
        <div className="flex-1 relative min-h-0">
          {historicalLoading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium shadow-xl"
              style={{ background: "#161b22", border: "1px solid #30363d", color: "#58a6ff" }}>
              <Clock className="w-3.5 h-3.5 animate-spin" />
              Loading past data — retrieving historical positions...
            </div>
          )}
          <IntelMap
            events={historicalEvents ?? filteredEvents}
            selectedEvent={selectedEvent}
            onEventClick={(event) => { setSelectedEvent(event); setDetailPanelOpen(true); }}
            region={currentRegion}
          />
          <TimeMachine
            onHistoricalData={(data) => { setHistoricalEvents(data); setHistoricalLoading(false); }}
            onLoadStart={() => setHistoricalLoading(true)}
            isLive={isLive}
            setIsLive={setIsLive}
          />
        </div>
      </main>

      {/* ── RIGHT DETAIL PANEL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {detailPanelOpen && (
          <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 380, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col shrink-0 overflow-hidden mt-12"
            style={{ background: "#161b22", borderLeft: "1px solid #30363d", width: 380 }}>

            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #30363d" }}>
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#e6edf3" }}>
                <FileText className="w-3.5 h-3.5" style={{ color: "#58a6ff" }} />
                Intelligence Report
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleAnalyze(true)} disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ background: "#1f6feb", color: "#fff" }}>
                  {isAnalyzing ? <Cpu className="w-3 h-3 animate-spin" /> : <Cpu className="w-3 h-3" />}
                  {isAnalyzing ? "Running..." : "Analyse"}
                </button>
                <button onClick={() => { setDetailPanelOpen(false); setSelectedEvent(null); setAnalysis(null); }}
                  className="p-1 rounded hover:bg-white/10 transition-colors" style={{ color: "#8b949e" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Selected event detail */}
              {selectedEvent && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: selectedEvent.type === 'aircraft' ? "#58a6ff" : selectedEvent.type === 'vessel' ? "#3fb950" : selectedEvent.intensity > 0.7 ? "#f85149" : "#d29922" }} />
                    <span className="text-xs font-semibold" style={{ color: "#8b949e", letterSpacing: "0.06em" }}>{selectedEvent.type.toUpperCase()}</span>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "#e6edf3" }}>{selectedEvent.label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[["Latitude", selectedEvent.lat.toFixed(5)], ["Longitude", selectedEvent.lng.toFixed(5)],
                      ["Intensity", `${Math.round(selectedEvent.intensity * 100)}%`],
                      ["Time", new Date(selectedEvent.timestamp).toLocaleTimeString()]].map(([k, v]) => (
                      <div key={k} className="px-3 py-2 rounded" style={{ background: "#21262d" }}>
                        <div style={{ color: "#8b949e", fontSize: 10 }}>{k}</div>
                        <div className="text-xs font-semibold mt-0.5" style={{ color: "#e6edf3" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-3 rounded text-xs leading-relaxed" style={{ background: "#21262d", color: "#8b949e" }}>
                    {selectedEvent.details}
                  </div>
                </section>
              )}

              {/* Analyzing spinner */}
              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="relative">
                    <Cpu className="w-10 h-10" style={{ color: "#58a6ff" }} />
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-2 border-dashed scale-150" style={{ borderColor: "#1f6feb55" }} />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold mb-1" style={{ color: "#58a6ff" }}>AI Analyst Active</div>
                    <div className="text-xs" style={{ color: "#8b949e" }}>{analysisStatus}</div>
                  </div>
                </div>
              )}

              {/* ── FULL ANALYSIS REPORT ─────────────────────────────── */}
              {analysis && !isAnalyzing && (
                <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                  {/* Header */}
                  <div className="px-3 py-1 rounded text-xs" style={{ background: "#21262d", border: "1px solid #30363d", color: "#8b949e" }}>
                    Analysis generated · {new Date((analysis as any).timestamp).toLocaleString()}
                    {(analysis as any)?.gibs_analyzed && <span style={{ color: "#3fb950", marginLeft: 8 }}>· GIBS imagery analysed</span>}
                  </div>

                  {/* Threat score */}
                  <div className="px-4 py-3 rounded-lg" style={{ background: "#21262d", border: `1px solid ${tlColor}44` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div style={{ color: "#8b949e", fontSize: 10, letterSpacing: "0.08em" }}>THREAT ASSESSMENT</div>
                        <div className="text-sm font-bold mt-0.5" style={{ color: tlColor }}>{analysis.threat_level || "GREEN"}</div>
                      </div>
                      <div className="text-3xl font-black" style={{ color: tlColor }}>{analysis.threat_score}%</div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "#30363d" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${analysis.threat_score}%` }}
                        className="h-full rounded-full" style={{ background: tlColor }} />
                    </div>
                  </div>

                  {/* Executive summary */}
                  {analysis.summary && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#8b949e", letterSpacing: "0.08em" }}>
                        <Info className="w-3 h-3" /> EXECUTIVE SUMMARY
                      </div>
                      <div className="px-3 py-3 rounded text-xs leading-relaxed" style={{ background: "#21262d", color: "#c9d1d9", lineHeight: 1.6 }}>
                        {analysis.summary}
                      </div>
                    </div>
                  )}

                  {/* Evidence */}
                  {Array.isArray(analysis?.evidence) && analysis.evidence.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#8b949e", letterSpacing: "0.08em" }}>
                        <Search className="w-3 h-3" /> EVIDENCE ({analysis.evidence.length} findings)
                      </div>
                      <div className="space-y-1.5">
                        {analysis.evidence.map((ev: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded text-xs" style={{ background: "#21262d", color: "#8b949e", lineHeight: 1.5 }}>
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#58a6ff" }} />
                            {ev}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Anomalies */}
                  {((analysis as any).aerial_anomalies?.length > 0 || (analysis as any).maritime_anomalies?.length > 0) && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#8b949e", letterSpacing: "0.08em" }}>
                        <Activity className="w-3 h-3" /> ANOMALIES DETECTED
                      </div>
                      {(analysis as any).aerial_anomalies?.map((a: string, i: number) => (
                        <div key={`air-${i}`} className="flex items-start gap-2 px-3 py-2 rounded text-xs" style={{ background: "#1f2d1f", border: "1px solid #2ea04344", color: "#8b949e" }}>
                          <Plane className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#3fb950" }} /> {a}
                        </div>
                      ))}
                      {(analysis as any).maritime_anomalies?.map((a: string, i: number) => (
                        <div key={`sea-${i}`} className="flex items-start gap-2 px-3 py-2 rounded text-xs" style={{ background: "#1a2433", border: "1px solid #58a6ff44", color: "#8b949e" }}>
                          <Ship className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#58a6ff" }} /> {a}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Seismic */}
                  {(analysis as any).seismic_analysis && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#8b949e", letterSpacing: "0.08em" }}>
                        <Radio className="w-3 h-3" /> SEISMIC ANALYSIS
                      </div>
                      <div className="px-3 py-2.5 rounded text-xs leading-relaxed" style={{ background: "#21262d", color: "#8b949e" }}>
                        {(analysis as any).seismic_analysis}
                      </div>
                    </div>
                  )}

                  {/* GPS jamming */}
                  {(analysis as any).gps_jamming_detected && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded text-xs font-semibold" style={{ background: "#2d2416", border: "1px solid #d2992244", color: "#d29922" }}>
                      <Wifi className="w-3.5 h-3.5" /> GPS jamming / spoofing detected in area of interest
                    </div>
                  )}

                  {/* Satellite imagery */}
                  {(analysis as any).imagery_analysis && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#8b949e", letterSpacing: "0.08em" }}>
                        <Orbit className="w-3 h-3" /> SATELLITE IMAGERY ANALYSIS
                      </div>
                      <div className="px-3 py-2.5 rounded text-xs leading-relaxed" style={{ background: "#21262d", color: "#8b949e" }}>
                        {(analysis as any).imagery_analysis}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  {analysis.recommendation && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#8b949e", letterSpacing: "0.08em" }}>
                        <CheckCircle className="w-3 h-3" /> RECOMMENDATION
                      </div>
                      <div className="px-3 py-3 rounded text-xs leading-relaxed font-medium" style={{ background: "#1f6feb15", border: "1px solid #1f6feb44", color: "#58a6ff", lineHeight: 1.6 }}>
                        {analysis.recommendation}
                      </div>
                    </div>
                  )}
                </motion.section>
              )}

              {/* Empty state */}
              {!selectedEvent && !analysis && !isAnalyzing && (
                <div className="text-center py-12 space-y-3">
                  <FileText className="w-8 h-8 mx-auto opacity-20" style={{ color: "#8b949e" }} />
                  <div className="text-xs" style={{ color: "#484f58" }}>Select an event on the map or run an AI analysis to generate an intelligence report.</div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Floating AI button when panel is closed */}
      {!detailPanelOpen && (
        <button onClick={() => { setDetailPanelOpen(true); handleAnalyze(true); }}
          className="absolute bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl transition-all hover:scale-105"
          style={{ background: "#1f6feb", color: "#fff", boxShadow: "0 4px 20px #1f6feb55" }}>
          <Cpu className="w-3.5 h-3.5" /> AI Analysis
        </button>
      )}
    </div>
  );
}
