import React, { useState, useRef, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { RefreshCw, Plane, Ship, Orbit, Radio, X, Info, Maximize2, Minimize2, Search } from "lucide-react";
import { IntelligenceEvent } from "../types";
import { renderToString } from "react-dom/server";
import { Region } from "../App";

const markerIcon = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png";
const markerShadow = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const createTacticalIcon = (type: string, color: string = "#58a6ff") => {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`;
  if (type === "aircraft") svg += `<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>`;
  else if (type === "vessel") svg += `<path d="M18 20H4l2-8h10l2 8z"/><path d="M4 12L2 6h20l-2 6"/><path d="M12 6V2"/>`;
  else if (type === "satellite") svg += `<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>`;
  else svg += `<circle cx="12" cy="12" r="5"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/>`;
  svg += `</svg>`;
  return L.divIcon({
    html: `<div style="filter: drop-shadow(0 0 4px ${color}88)">${svg}</div>`,
    className: "", iconSize: [16, 16], iconAnchor: [8, 8],
  });
};

const GIBS_LAYERS = [
  { id: 'true', name: 'TRUE COLOR', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=800&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
  { id: 'thermal', name: 'THERMAL IR', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_Thermal_Anomalies_All&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=800&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
  { id: 'fire', name: 'FIRE/HEAT', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=VIIRS_SNPP_Fires_All&FORMAT=image/png&WIDTH=1200&HEIGHT=800&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
  { id: 'aod', name: 'SMOKE/DUST', url: (date: string) => `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_Aerosol&FORMAT=image/png&WIDTH=1200&HEIGHT=800&CRS=CRS:84&BBOX=25,10,65,45&TIME=${date}` },
];

// Component that updates map view when region changes
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom]);
  return null;
}

// Draggable panel
function DraggablePanel({ title, color, onClose, children, defaultPos, defaultSize }: {
  title: string; color: string; onClose: () => void;
  children: React.ReactNode;
  defaultPos: { x: number; y: number };
  defaultSize: { w: number; h: number };
}) {
  const [pos, setPos] = useState(defaultPos);
  const [size, setSize] = useState(defaultSize);
  const [maximized, setMaximized] = useState(false);
  const [prevState, setPrevState] = useState({ pos: defaultPos, size: defaultSize });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y });
    };
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  const toggleMaximize = () => {
    if (maximized) { setPos(prevState.pos); setSize(prevState.size); setMaximized(false); }
    else { setPrevState({ pos, size }); setPos({ x: 10, y: 10 }); setSize({ w: window.innerWidth - 420, h: window.innerHeight - 120 }); setMaximized(true); }
  };

  const actualPos = maximized ? { x: 10, y: 10 } : pos;
  const actualSize = maximized ? { w: window.innerWidth - 420, h: window.innerHeight - 120 } : size;

  return (
    <div className="absolute z-[2000] flex flex-col"
      style={{ left: actualPos.x, top: actualPos.y, width: actualSize.w, height: actualSize.h, border: `1px solid ${color}66`, background: 'rgba(13,17,23,0.97)', borderRadius: 8, boxShadow: `0 8px 32px rgba(0,0,0,0.6)`, resize: maximized ? 'none' : 'both', overflow: 'hidden', minWidth: 320, minHeight: 200 }}>
      <div onMouseDown={onMouseDown} className="flex items-center justify-between px-3 py-2 cursor-move shrink-0 select-none"
        style={{ borderBottom: `1px solid ${color}33`, background: `${color}11`, borderRadius: "8px 8px 0 0" }}>
        <span className="font-semibold text-xs tracking-wide" style={{ color, fontFamily: "'Inter', system-ui, sans-serif" }}>{title}</span>
        <div className="flex items-center gap-2">
          <button onClick={toggleMaximize} style={{ color }} className="hover:opacity-70 p-0.5">
            {maximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button onClick={onClose} style={{ color }} className="hover:opacity-70 p-0.5"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

// Place search
function PlaceSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const map = useMap();

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'OPHANIM-V2/1.0' }
      });
      const data = await resp.json();
      if (data[0]) { map.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 10, { duration: 1.5 }); }
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="absolute top-3 left-3 z-[1000] flex gap-2" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
        placeholder="Search place, address, flight area..."
        style={{ width: 280, padding: "8px 12px", background: "rgba(22,27,34,0.97)", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", fontSize: 12, outline: "none" }} />
      <button onClick={search} style={{ padding: "8px 16px", background: "#1f6feb", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        {loading ? "..." : "Search"}
      </button>
    </div>
  );
}

interface IntelMapProps {
  events: IntelligenceEvent[];
  selectedEvent: IntelligenceEvent | null;
  onEventClick: (event: IntelligenceEvent) => void;
  region?: Region;
}

export default function IntelMap({ events, selectedEvent, onEventClick, region }: IntelMapProps) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showGibsPanel, setShowGibsPanel] = useState(false);
  const [showNoFlyPanel, setShowNoFlyPanel] = useState(false);
  const [showJammingPanel, setShowJammingPanel] = useState(false);
  const [showSatellitePanel, setShowSatellitePanel] = useState(false);
  const [showVesselPanel, setShowVesselPanel] = useState(false);
  const [showFlightPanel, setShowFlightPanel] = useState(false);
  const [gibsLayer, setGibsLayer] = useState(0);
  const [gibsDate, setGibsDate] = useState(new Date(Date.now() - 86400000).toISOString().split('T')[0]);
  const [gibsZoom, setGibsZoom] = useState(1);
  const mapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);

  const center: [number, number] = region?.center || [24.0, 50.0];
  const zoom = region?.zoom || 5;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const Win = window as any;
    if (!Win.L?.heatLayer) return;
    if (heatLayerRef.current) { try { map.removeLayer(heatLayerRef.current); } catch(e) {} heatLayerRef.current = null; }
    if (!showHeatmap || events.length === 0) return;
    const points = events.filter(e => e.lat && e.lng).map(e => [e.lat, e.lng, e.intensity || 0.5] as [number, number, number]);
    if (points.length === 0) return;
    heatLayerRef.current = Win.L.heatLayer(points, { radius: 40, blur: 30, maxZoom: 12, max: 1.0, gradient: { 0.2: '#22c55e', 0.5: '#eab308', 0.8: '#f97316', 1.0: '#ef4444' } }).addTo(map);
  }, [showHeatmap, events]);

  const btnStyle = (active: boolean, color: string) => ({
    display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
    background: active ? color : "rgba(22,27,34,0.95)",
    color: active ? "#fff" : color,
    border: `1px solid ${color}88`, borderRadius: 6, fontSize: 11, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
    boxShadow: active ? `0 0 12px ${color}44` : "none", transition: "all 0.15s",
    whiteSpace: "nowrap" as const
  });

  return (
    <div className="relative w-full h-full" style={{ background: "#0d1117" }}>

      {/* GIBS Panel */}
      {showGibsPanel && (
        <DraggablePanel title="NASA GIBS — Satellite Imagery" color="#a371f7" onClose={() => setShowGibsPanel(false)} defaultPos={{ x: 60, y: 60 }} defaultSize={{ w: 580, h: 460 }}>
          <div className="p-2 flex gap-1 flex-wrap shrink-0" style={{ borderBottom: "1px solid #30363d" }}>
            {GIBS_LAYERS.map((l, i) => (
              <button key={l.id} onClick={() => setGibsLayer(i)}
                style={{ padding: "4px 8px", fontSize: 10, fontWeight: 700, border: `1px solid #a371f766`, borderRadius: 4, background: gibsLayer === i ? "#a371f7" : "transparent", color: gibsLayer === i ? "#fff" : "#a371f7", cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}>
                {l.name}
              </button>
            ))}
            <input type="date" value={gibsDate} onChange={e => setGibsDate(e.target.value)}
              style={{ marginLeft: "auto", fontSize: 10, background: "#161b22", border: "1px solid #30363d", color: "#e6edf3", padding: "4px 6px", borderRadius: 4 }}
              max={new Date().toISOString().split('T')[0]} />
            <div className="flex items-center gap-1">
              <button onClick={() => setGibsZoom(z => Math.max(0.5, z - 0.25))} style={{ padding: "2px 8px", border: "1px solid #30363d", background: "transparent", color: "#a371f7", cursor: "pointer" }}>−</button>
              <span style={{ fontSize: 10, color: "#8b949e" }}>{Math.round(gibsZoom * 100)}%</span>
              <button onClick={() => setGibsZoom(z => Math.min(3, z + 0.25))} style={{ padding: "2px 8px", border: "1px solid #30363d", background: "transparent", color: "#a371f7", cursor: "pointer" }}>+</button>
            </div>
          </div>
          <div style={{ overflow: "auto", flex: 1 }}>
            <img src={GIBS_LAYERS[gibsLayer].url(gibsDate)} alt="NASA GIBS"
              style={{ transform: `scale(${gibsZoom})`, transformOrigin: "top left", width: `${100 / gibsZoom}%` }}
              onError={e => { (e.target as HTMLImageElement).alt = "Image unavailable for this date"; }} />
          </div>
        </DraggablePanel>
      )}

      {/* No-fly zones panel */}
      {showNoFlyPanel && (
        <DraggablePanel title="No-Fly Zones & NOTAM — MENA" color="#f97316" onClose={() => setShowNoFlyPanel(false)} defaultPos={{ x: 60, y: 380 }} defaultSize={{ w: 400, h: 360 }}>
          <div style={{ padding: 12, overflowY: "auto", height: "100%", fontFamily: "'Inter', system-ui, sans-serif" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", marginBottom: 12, letterSpacing: "0.06em" }}>ACTIVE AIRSPACE RESTRICTIONS</div>
            {[
              { zone: "YEMEN FIR", status: "DANGER", detail: "Active conflict zone. All civil aviation suspended. NOTAM YE-A0012/26" },
              { zone: "ISRAEL TMA", status: "ACTIVE NFZ", detail: "NFZ active over northern borders. IDF operations ongoing. NOTAM IL-A0891/26" },
              { zone: "IRAN FIR", status: "RESTRICTED", detail: "Foreign military aircraft require prior permission. NOTAM A0234/26" },
              { zone: "RED SEA", status: "CAUTION", detail: "Houthi drone threat. Airlines advised FL300+. Monitor 121.5MHz" },
              { zone: "IRAQ AIRSPACE", status: "CAUTION", detail: "Coalition ops active. Blocks restricted below FL200." },
              { zone: "PERSIAN GULF", status: "MONITOR", detail: "Iranian ADIZ active. Squawk 7600 incidents reported." },
              { zone: "BEIRUT FIR", status: "RESTRICTED", detail: "Lebanese airspace partially restricted. IDF proximity advisory." },
              { zone: "SINAI", status: "CAUTION", detail: "GPS jamming reported. Navigation advisory for overflying aircraft." },
            ].map((item, i) => (
              <div key={i} style={{ padding: "8px 10px", marginBottom: 6, borderLeft: `3px solid ${item.status === 'DANGER' ? '#f85149' : item.status === 'ACTIVE NFZ' ? '#f97316' : item.status === 'RESTRICTED' ? '#d29922' : '#484f58'}`, background: "#161b22", borderRadius: "0 4px 4px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#e6edf3" }}>{item.zone}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: item.status === 'DANGER' ? '#f85149' : item.status === 'ACTIVE NFZ' ? '#f97316' : item.status === 'RESTRICTED' ? '#d29922' : '#8b949e' }}>{item.status}</span>
                </div>
                <div style={{ fontSize: 10, color: "#8b949e" }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </DraggablePanel>
      )}

      {/* GPS Jamming panel */}
      {showJammingPanel && (
        <DraggablePanel title="GPS Jamming / Spoofing — Live" color="#d29922" onClose={() => setShowJammingPanel(false)} defaultPos={{ x: 480, y: 380 }} defaultSize={{ w: 500, h: 360 }}>
          <iframe src="https://gpsjam.org/?lat=25&lon=45&z=5" className="w-full h-full border-0" title="GPS Jamming" style={{ pointerEvents: "all" }} />
        </DraggablePanel>
      )}

      {/* N2YO Satellite panel */}
      {showSatellitePanel && (
        <DraggablePanel title="Live Satellite Tracker — N2YO" color="#a371f7" onClose={() => setShowSatellitePanel(false)} defaultPos={{ x: 300, y: 60 }} defaultSize={{ w: 520, h: 420 }}>
          <iframe src="https://www.n2yo.com/passes/?s=25544" className="w-full h-full border-0" title="N2YO Satellites" style={{ pointerEvents: "all" }} />
        </DraggablePanel>
      )}

      {/* VesselFinder panel — INTERACTIVE */}
      {showVesselPanel && (
        <DraggablePanel title="AIS — Live Maritime Traffic" color="#3fb950" onClose={() => setShowVesselPanel(false)} defaultPos={{ x: 60, y: 60 }} defaultSize={{ w: 700, h: 500 }}>
          <iframe
            src="https://www.vesselfinder.com/aismap?zoom=5&lat=25&lon=50&width=100%25&height=100%25&names=true"
            className="w-full h-full border-0" title="VesselFinder"
            style={{ pointerEvents: "all" }}
            allow="geolocation"
          />
        </DraggablePanel>
      )}

      {/* ADSBExchange panel — INTERACTIVE */}
      {showFlightPanel && (
        <DraggablePanel title="ADS-B — Live Flight Tracking" color="#58a6ff" onClose={() => setShowFlightPanel(false)} defaultPos={{ x: 60, y: 60 }} defaultSize={{ w: 700, h: 500 }}>
          <iframe
            src="https://globe.adsbexchange.com/?lat=25&lon=50&zoom=5"
            className="w-full h-full border-0" title="ADS-B Exchange"
            style={{ pointerEvents: "all" }}
            allow="geolocation"
          />
        </DraggablePanel>
      )}

      {/* MAIN MAP */}
      <MapContainer
        center={center} zoom={zoom}
        className="w-full h-full"
        zoomControl={true}
        ref={(map: any) => { if (map) mapRef.current = map; }}
        style={{ background: "#0d1117" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapController center={center} zoom={zoom} />
        <PlaceSearch />

        {events.map((event) => {
          const color =
            event.type === 'aircraft' ? (event.intensity > 0.7 ? "#f85149" : "#58a6ff") :
            event.type === 'vessel' ? '#3fb950' :
            event.type === 'satellite' ? '#a371f7' :
            event.intensity > 0.8 ? '#f85149' :
            event.intensity > 0.5 ? '#f97316' : '#d29922';

          return (
            <React.Fragment key={event.id}>
              <Marker
                position={[event.lat, event.lng]}
                icon={createTacticalIcon(event.type, color)}
                eventHandlers={{ click: () => onEventClick(event) }}
              >
                <Popup>
                  <div style={{ background: "#161b22", color: "#e6edf3", padding: 10, borderRadius: 6, minWidth: 200, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: "#58a6ff" }}>{event.label}</div>
                    <div style={{ color: "#8b949e", fontSize: 10, marginBottom: 6 }}>{event.type.toUpperCase()} · {new Date(event.timestamp).toLocaleTimeString()}</div>
                    <div style={{ color: "#c9d1d9", lineHeight: 1.5 }}>{event.details}</div>
                  </div>
                </Popup>
              </Marker>
              {event.path && event.path.length > 1 && (
                <Polyline positions={event.path} pathOptions={{ color, weight: 1.5, opacity: 0.5, dashArray: "4, 8" }} />
              )}
              {event.intensity > 0.6 && (
                <Circle center={[event.lat, event.lng]} radius={25000 * event.intensity}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.08, weight: 1, dashArray: "4, 6" }} />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Waiting state */}
      {events.length === 0 && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center pointer-events-none">
          <div style={{ background: "rgba(22,27,34,0.92)", border: "1px solid #30363d", borderRadius: 12, padding: "28px 36px", textAlign: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "#58a6ff" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e6edf3", marginBottom: 6 }}>Waiting for live feeds</div>
            <div style={{ fontSize: 12, color: "#8b949e" }}>Global map ready. Data appears as feeds respond.</div>
          </div>
        </div>
      )}

      {/* RIGHT SIDE CONTROL BUTTONS */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
        <div style={{ padding: "4px 8px", background: "rgba(22,27,34,0.95)", border: "1px solid #30363d", borderRadius: 6, fontSize: 10, color: "#3fb950", fontFamily: "'Inter', system-ui, sans-serif", textAlign: "center" }}>
          {events.length} plotted
        </div>

        <button onClick={() => setShowGibsPanel(p => !p)} style={btnStyle(showGibsPanel, "#a371f7")}>
          <Orbit className="w-3.5 h-3.5" /> Imagery
        </button>
        <button onClick={() => setShowVesselPanel(p => !p)} style={btnStyle(showVesselPanel, "#3fb950")}>
          <Ship className="w-3.5 h-3.5" /> AIS
        </button>
        <button onClick={() => setShowFlightPanel(p => !p)} style={btnStyle(showFlightPanel, "#58a6ff")}>
          <Plane className="w-3.5 h-3.5" /> ADS-B
        </button>
        <button onClick={() => setShowSatellitePanel(p => !p)} style={btnStyle(showSatellitePanel, "#a371f7")}>
          <Orbit className="w-3.5 h-3.5" /> SAT
        </button>
        <button onClick={() => setShowNoFlyPanel(p => !p)} style={btnStyle(showNoFlyPanel, "#f97316")}>
          <Plane className="w-3.5 h-3.5" /> GPS
        </button>
        <button onClick={() => setShowJammingPanel(p => !p)} style={btnStyle(showJammingPanel, "#d29922")}>
          <Radio className="w-3.5 h-3.5" /> Plugins
        </button>
        <button onClick={() => setShowHeatmap(p => !p)} style={btnStyle(showHeatmap, "#f85149")}>
          🔥 {showHeatmap ? "Heatmap On" : "Heatmap"}
        </button>
      </div>
    </div>
  );
}
