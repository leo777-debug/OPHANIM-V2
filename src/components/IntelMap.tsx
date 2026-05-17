import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { renderToString } from "react-dom/server";
import {
  Aperture, Cable, Crosshair, Info, Layers, Maximize2, Minimize2,
  Orbit, Plane, Radio, Search, Ship, X, Satellite, Zap,
} from "lucide-react";
import { IntelligenceEvent } from "../types";
import { RegionPreset } from "../geo";

const markerIcon = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png";
const markerShadow = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const GIBS_LAYERS = [
  { id: "true",    name: "True color", layer: "MODIS_Terra_CorrectedReflectance_TrueColor", format: "image/jpeg" },
  { id: "thermal", name: "Thermal IR",  layer: "MODIS_Terra_Thermal_Anomalies_All",          format: "image/png"  },
  { id: "fire",    name: "Fire heat",   layer: "VIIRS_SNPP_Fires_All",                        format: "image/png"  },
  { id: "aod",     name: "Smoke dust",  layer: "MODIS_Terra_Aerosol",                         format: "image/png"  },
];

function iconForEvent(type: string) {
  if (type === "aircraft" || type === "airport") return <Plane className="w-4 h-4" />;
  if (type === "vessel")    return <Ship className="w-4 h-4" />;
  if (type === "satellite") return <Satellite className="w-4 h-4" />;
  if (type === "cable")     return <Cable className="w-4 h-4" />;
  if (type === "camera")    return <Aperture className="w-4 h-4" />;
  return <Crosshair className="w-4 h-4" />;
}

const createIntelIcon = (event: IntelligenceEvent, selected: boolean) => {
  const color =
    event.intensity > 0.78 ? "#ef4444" :
    event.type === "vessel"    ? "#38bdf8" :
    event.type === "satellite" ? "#a78bfa" :
    event.type === "airport"   ? "#60a5fa" :
    event.type === "facility"  ? "#f59e0b" :
    event.type === "cable"     ? "#22d3ee" :
    event.type === "camera"    ? "#94a3b8" :
    event.type === "conflict"  ? "#fb7185" : "#34d399";

  const isMilitary  = event.label?.startsWith("MIL") || event.id?.startsWith("miladsb-");
  const shouldRotate = event.type === "aircraft" || event.type === "vessel";
  const heading      = event.heading ?? 0;
  const innerRotate  = shouldRotate ? `rotate(${heading}deg)` : "none";
  const militaryRing = isMilitary
    ? `box-shadow:0 0 0 2px #ef4444,0 0 18px rgba(239,68,68,0.55);`
    : `box-shadow:0 0 0 2px rgba(2,6,13,0.5),0 0 18px color-mix(in srgb,${color},transparent 65%);`;

  return L.divIcon({
    html: `
      <div class="intel-marker ${selected ? "is-selected" : ""} ${isMilitary ? "is-military" : ""}"
           style="--marker-color:${color};${militaryRing}">
        <span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;
                     transform:${innerRotate};transition:transform 0.3s;">
          ${renderToString(iconForEvent(event.type))}
        </span>
      </div>`,
    className: "intel-div-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

function gibsUrl(region: RegionPreset, layerIndex: number, date: string) {
  const [west, south, east, north] = region.bbox;
  const layer = GIBS_LAYERS[layerIndex];
  return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${layer.layer}&FORMAT=${layer.format}&WIDTH=1400&HEIGHT=900&CRS=CRS:84&BBOX=${west},${south},${east},${north}&TIME=${date}`;
}

// ── DRAGGABLE PANEL ────────────────────────────────────────────────────────────
function DraggablePanel({ title, onClose, children, defaultPos, defaultSize }: {
  title: string; onClose: () => void; children: React.ReactNode;
  defaultPos: { x: number; y: number }; defaultSize: { w: number; h: number };
}) {
  const [pos, setPos]         = useState(defaultPos);
  const [size, setSize]       = useState(defaultSize);
  const [maximized, setMax]   = useState(false);
  const [prev, setPrev]       = useState({ pos: defaultPos, size: defaultSize });
  const dragging              = useRef(false);
  const offset                = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const onMove = (ev: MouseEvent) => {
      if (dragging.current) setPos({ x: ev.clientX - offset.current.x, y: ev.clientY - offset.current.y });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  const toggleMax = () => {
    if (maximized) { setPos(prev.pos); setSize(prev.size); setMax(false); }
    else {
      setPrev({ pos, size });
      setPos({ x: 12, y: 64 });
      setSize({ w: Math.max(420, window.innerWidth - 460), h: Math.max(320, window.innerHeight - 160) });
      setMax(true);
    }
  };

  const ap = maximized ? { x: 12, y: 64 } : pos;
  const as = maximized
    ? { w: Math.max(420, window.innerWidth - 460), h: Math.max(320, window.innerHeight - 160) }
    : size;

  return (
    // ✅ pointer-events: all — panel itself captures ALL mouse events
    <div className="intel-panel"
         style={{ left: ap.x, top: ap.y, width: as.w, height: as.h,
                  resize: maximized ? "none" : "both", pointerEvents: "all" }}>
      <div onMouseDown={onMouseDown} className="intel-panel__bar">
        <span>{title}</span>
        <div className="flex items-center gap-1">
          <button onClick={toggleMax} className="icon-button small">
            {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onClose} className="icon-button small"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {/* ✅ iframe body: pointer-events: all so it receives all mouse/touch input */}
      <div className="intel-panel__body" style={{ pointerEvents: "all" }}>{children}</div>
    </div>
  );
}

function MapController({ region, focus }: { region: RegionPreset; focus?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { map.flyTo(region.center, region.zoom, { duration: 0.8 }); }, [map, region]);
  useEffect(() => { if (focus) map.flyTo(focus, Math.max(map.getZoom(), 9), { duration: 0.7 }); }, [focus, map]);
  return null;
}

interface SearchResult { id: string | number; label: string; lat: number; lng: number; type?: string; }

interface IntelMapProps {
  apiBase: string;
  events: IntelligenceEvent[];
  selectedEvent: IntelligenceEvent | null;
  onEventClick: (event: IntelligenceEvent) => void;
  onAnalyzeEvent?: (event: IntelligenceEvent) => void;
  region: RegionPreset;
  showBorders: boolean;
}

function PopupContent({ event, onAnalyze }: { event: IntelligenceEvent; onAnalyze?: () => void }) {
  const isMilitary  = event.label?.startsWith("MIL") || event.id?.startsWith("miladsb-");
  const isAircraft  = event.type === "aircraft";
  const isVessel    = event.type === "vessel";
  const isSatellite = event.type === "satellite";
  const headingStr  = event.heading  != null ? `${Math.round(event.heading)}°`  : "—";
  const speedStr    = event.speed    != null ? `${event.speed} kt`               : "—";
  const altStr      = event.altitude != null ? `${Math.round(event.altitude).toLocaleString()} ft` : "—";

  return (
    <div className="popup-card popup-card--rich">
      <div className="popup-card__badge" data-type={event.type}>
        {isMilitary ? "⚠ MILITARY" : event.type.toUpperCase()}
      </div>
      <div className="popup-card__title">{event.label}</div>
      <div className="popup-card__meta">{new Date(event.timestamp).toLocaleString()}</div>
      {isAircraft && (
        <div className="popup-grid">
          <div><span>Heading</span><strong>{headingStr}</strong></div>
          <div><span>Speed</span><strong>{speedStr}</strong></div>
          <div><span>Altitude</span><strong>{altStr}</strong></div>
          {event.squawk && <div><span>Squawk</span><strong>{event.squawk}</strong></div>}
        </div>
      )}
      {isVessel && (
        <div className="popup-grid">
          <div><span>Heading</span><strong>{headingStr}</strong></div>
          <div><span>Speed</span><strong>{speedStr}</strong></div>
          {event.mmsi    && <div><span>MMSI</span><strong>{event.mmsi}</strong></div>}
          {event.country && <div><span>Flag</span><strong>{event.country}</strong></div>}
        </div>
      )}
      {isSatellite && (
        <div className="popup-grid">
          <div><span>Alt</span><strong>{(event.details?.match(/Alt: (\d+) km/)?.[1] ?? "—") + " km"}</strong></div>
          <div><span>NORAD</span><strong>{event.id?.replace("n2yo-", "") ?? "—"}</strong></div>
        </div>
      )}
      <div className="popup-card__body">{event.details}</div>
      {onAnalyze && (
        <button className="popup-analyze-btn" onClick={onAnalyze}>
          <Zap className="w-3 h-3" /> Analyze this asset
        </button>
      )}
    </div>
  );
}

export default function IntelMap({ apiBase, events, selectedEvent, onEventClick, onAnalyzeEvent, region, showBorders }: IntelMapProps) {
  // Panels open as draggable windows — NOT full-screen overlays
  const [showVesselPanel,    setShowVesselPanel]    = useState(false);
  const [showFlightPanel,    setShowFlightPanel]    = useState(false);
  const [showSatellitePanel, setShowSatellitePanel] = useState(false);
  const [showGibsPanel,      setShowGibsPanel]      = useState(false);
  const [showJammingPanel,   setShowJammingPanel]   = useState(false);
  const [gibsLayer,          setGibsLayer]          = useState(0);
  const [gibsDate,           setGibsDate]           = useState(new Date(Date.now() - 86400000).toISOString().split("T")[0]);
  const [query,              setQuery]              = useState("");
  const [results,            setResults]            = useState<SearchResult[]>([]);
  const [searchEvents,       setSearchEvents]       = useState<IntelligenceEvent[]>([]);
  const [searchMode,         setSearchMode]         = useState<"place" | "near">("place");
  const [focus,              setFocus]              = useState<[number, number] | null>(null);
  const [searching,          setSearching]          = useState(false);

  const allEvents = useMemo(() => [...events, ...searchEvents], [events, searchEvents]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      if (searchMode === "near" && selectedEvent) {
        const params = new URLSearchParams({ q: query, lat: String(selectedEvent.lat), lng: String(selectedEvent.lng), radius: "50000" });
        const resp = await fetch(`${apiBase}/api/data?feed=osm-search&${params}`);
        const data = await resp.json();
        setSearchEvents(data.events || []);
        setResults([]);
      } else {
        const params = new URLSearchParams({ q: query, region: region.key });
        const resp = await fetch(`${apiBase}/api/data?feed=search&${params}`);
        const data = await resp.json();
        setResults(data.results || []);
      }
    } finally { setSearching(false); }
  };

  const selectResult = (result: SearchResult) => {
    setFocus([result.lat, result.lng]);
    setResults([]);
    const event: IntelligenceEvent = {
      id: `search-${result.id}`, type: "infrastructure",
      lat: result.lat, lng: result.lng, label: result.label,
      intensity: 0.4, details: `OSM: ${result.type || "place"}`,
      timestamp: new Date().toISOString(), sourceLayer: "osmSearch",
    };
    setSearchEvents([event]);
    onEventClick(event);
  };

  // Build iframe src URLs using region centre
  const vesselSrc  = `https://www.vesselfinder.com/aismap?zoom=${Math.max(3, region.zoom)}&lat=${region.center[0]}&lon=${region.center[1]}&width=100%25&height=100%25&names=true&fleet=false`;
  const flightSrc  = `https://globe.adsbexchange.com/?lat=${region.center[0]}&lon=${region.center[1]}&zoom=${Math.max(3, region.zoom)}`;
  const jammingSrc = `https://gpsjam.org/?lat=${region.center[0]}&lon=${region.center[1]}&z=${region.zoom + 1}`;

  return (
    <div className="relative w-full h-full bg-[#0b1118]">

      {/* ── GIBS imagery panel ─────────────────────────────────────────────── */}
      {showGibsPanel && (
        <DraggablePanel title={`NASA GIBS — ${region.label}`} onClose={() => setShowGibsPanel(false)}
          defaultPos={{ x: 64, y: 88 }} defaultSize={{ w: 620, h: 460 }}>
          <div className="panel-toolbar">
            {GIBS_LAYERS.map((layer, i) => (
              <button key={layer.id} onClick={() => setGibsLayer(i)}
                className={gibsLayer === i ? "segmented is-active" : "segmented"}>{layer.name}</button>
            ))}
            <input type="date" value={gibsDate} onChange={e => setGibsDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]} className="date-input" />
          </div>
          <div className="h-full overflow-auto bg-black">
            <img src={gibsUrl(region, gibsLayer, gibsDate)} alt="NASA GIBS" className="min-w-full" />
          </div>
        </DraggablePanel>
      )}

      {/* ── AIS — draggable interactive panel ─────────────────────────────── */}
      {showVesselPanel && (
        <DraggablePanel title="AIS — Live maritime traffic (interactive)" onClose={() => setShowVesselPanel(false)}
          defaultPos={{ x: 64, y: 88 }} defaultSize={{ w: 740, h: 540 }}>
          {/* ✅ iframe gets pointer-events from parent panel — fully interactive */}
          <iframe
            src={vesselSrc}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            title="AIS live vessels"
            allow="geolocation"
          />
        </DraggablePanel>
      )}

      {/* ── ADS-B — draggable interactive panel ───────────────────────────── */}
      {showFlightPanel && (
        <DraggablePanel title="ADS-B — Live flight tracking (interactive)" onClose={() => setShowFlightPanel(false)}
          defaultPos={{ x: 64, y: 88 }} defaultSize={{ w: 740, h: 540 }}>
          {/* ✅ iframe gets pointer-events from parent panel — fully interactive */}
          <iframe
            src={flightSrc}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            title="ADS-B live flights"
            allow="geolocation"
          />
        </DraggablePanel>
      )}

      {/* ── GPS jamming panel ──────────────────────────────────────────────── */}
      {showJammingPanel && (
        <DraggablePanel title="GPS jamming monitor — gpsjam.org" onClose={() => setShowJammingPanel(false)}
          defaultPos={{ x: 560, y: 88 }} defaultSize={{ w: 520, h: 420 }}>
          <iframe src={jammingSrc} style={{ width: "100%", height: "100%", border: "none" }} title="GPS jamming" />
        </DraggablePanel>
      )}

      {/* ── N2YO satellite panel ───────────────────────────────────────────── */}
      {showSatellitePanel && (
        <DraggablePanel title="Satellite tracker — N2YO live passes" onClose={() => setShowSatellitePanel(false)}
          defaultPos={{ x: 300, y: 110 }} defaultSize={{ w: 560, h: 460 }}>
          <div className="panel-toolbar">
            <button className="segmented is-active">ISS passes</button>
          </div>
          <iframe
            src="https://www.n2yo.com/passes/?s=25544"
            style={{ width: "100%", height: "calc(100% - 48px)", border: "none" }}
            title="Live satellites N2YO"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </DraggablePanel>
      )}

      {/* ── Map search ────────────────────────────────────────────────────── */}
      <div className="map-search">
        <div className="map-search__box">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runSearch()}
            placeholder={searchMode === "place" ? "Search place, address, flight area" : "Search OSM near selected item"} />
          <button onClick={runSearch} className="text-button">{searching ? "Searching…" : "Search"}</button>
        </div>
        <div className="map-search__modes">
          <button onClick={() => setSearchMode("place")} className={searchMode === "place" ? "segmented is-active" : "segmented"}>Place</button>
          <button onClick={() => setSearchMode("near")} disabled={!selectedEvent} className={searchMode === "near" ? "segmented is-active" : "segmented"}>Near selected</button>
        </div>
        {results.length > 0 && (
          <div className="map-search__results">
            {results.map(result => (
              <button key={result.id} onClick={() => selectResult(result)}>
                <span>{result.label}</span><small>{result.type || "place"}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {allEvents.length === 0 && (
        <div className="empty-map-state">
          <Layers className="w-8 h-8" />
          <div>Waiting for live feeds</div>
          <span>Global map ready. Data appears as feeds respond.</span>
        </div>
      )}

      {/* ── MAIN LEAFLET MAP ──────────────────────────────────────────────── */}
      <MapContainer center={region.center} zoom={region.zoom}
        className="w-full h-full" zoomControl={false} worldCopyJump>
        <MapController region={region} focus={focus} />
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        />
        {showBorders && (
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            zIndex={650}
          />
        )}
        {allEvents.map(event => {
          const selected = selectedEvent?.id === event.id;
          const color =
            event.intensity > 0.78 ? "#ef4444" :
            event.type === "vessel"    ? "#38bdf8" :
            event.type === "satellite" ? "#a78bfa" :
            event.type === "conflict"  ? "#fb7185" : "#34d399";
          return (
            <React.Fragment key={event.id}>
              <Marker position={[event.lat, event.lng]} icon={createIntelIcon(event, selected)}
                eventHandlers={{ click: () => onEventClick(event) }}>
                <Popup maxWidth={300} className="intel-popup">
                  <PopupContent event={event}
                    onAnalyze={onAnalyzeEvent ? () => { onEventClick(event); onAnalyzeEvent(event); } : undefined} />
                </Popup>
              </Marker>
              {event.path && event.path.length > 1 && (
                <Polyline positions={event.path} pathOptions={{ color, weight: 1.5, opacity: 0.65, dashArray: "5, 8" }} />
              )}
              {event.intensity > 0.6 && (
                <Circle center={[event.lat, event.lng]} radius={26000 * event.intensity}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.09, weight: 1, dashArray: "5, 7" }} />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* ── MAP TOOLBAR ───────────────────────────────────────────────────── */}
      <div className="map-toolbar">
        <div className="map-toolbar__status">
          <span>{region.label}</span>
          <small>{allEvents.length} plotted</small>
        </div>
        <button onClick={() => setShowGibsPanel(p => !p)}
          className={showGibsPanel ? "tool-toggle is-active" : "tool-toggle"} title="NASA GIBS imagery">
          <Orbit className="w-4 h-4" /> Imagery
        </button>
        {/* ✅ AIS and ADS-B now open as interactive draggable panels */}
        <button onClick={() => setShowVesselPanel(p => !p)}
          className={showVesselPanel ? "tool-toggle is-active" : "tool-toggle"} title="AIS vessel traffic">
          <Ship className="w-4 h-4" /> AIS
        </button>
        <button onClick={() => setShowFlightPanel(p => !p)}
          className={showFlightPanel ? "tool-toggle is-active" : "tool-toggle"} title="ADS-B flight tracking">
          <Plane className="w-4 h-4" /> ADS-B
        </button>
        <button onClick={() => setShowSatellitePanel(p => !p)}
          className={showSatellitePanel ? "tool-toggle is-active" : "tool-toggle"} title="N2YO satellite tracker">
          <Satellite className="w-4 h-4" /> SAT
        </button>
        <button onClick={() => setShowJammingPanel(p => !p)}
          className={showJammingPanel ? "tool-toggle is-active" : "tool-toggle"} title="GPS jamming monitor">
          <Radio className="w-4 h-4" /> GPS
        </button>
        <button className="tool-toggle" title="Enable layers via left panel">
          <Info className="w-4 h-4" /> Plugins
        </button>
      </div>
    </div>
  );
}
