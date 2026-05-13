import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { renderToString } from "react-dom/server";
import {
  Aperture,
  Cable,
  Crosshair,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Orbit,
  Plane,
  Radio,
  Search,
  Ship,
  X,
} from "lucide-react";
import { IntelligenceEvent } from "../types";
import { RegionPreset } from "../geo";

const markerIcon = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png";
const markerShadow = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const GIBS_LAYERS = [
  { id: "true", name: "True color", layer: "MODIS_Terra_CorrectedReflectance_TrueColor", format: "image/jpeg" },
  { id: "thermal", name: "Thermal IR", layer: "MODIS_Terra_Thermal_Anomalies_All", format: "image/png" },
  { id: "fire", name: "Fire heat", layer: "VIIRS_SNPP_Fires_All", format: "image/png" },
  { id: "aod", name: "Smoke dust", layer: "MODIS_Terra_Aerosol", format: "image/png" },
];

function iconForEvent(type: string) {
  if (type === "aircraft" || type === "airport") return <Plane className="w-4 h-4" />;
  if (type === "vessel") return <Ship className="w-4 h-4" />;
  if (type === "satellite") return <Orbit className="w-4 h-4" />;
  if (type === "cable") return <Cable className="w-4 h-4" />;
  if (type === "camera") return <Aperture className="w-4 h-4" />;
  return <Crosshair className="w-4 h-4" />;
}

const createIntelIcon = (event: IntelligenceEvent, selected: boolean) => {
  const color = event.intensity > 0.78 ? "#ef4444" :
    event.type === "vessel" ? "#38bdf8" :
    event.type === "satellite" ? "#a78bfa" :
    event.type === "airport" ? "#60a5fa" :
    event.type === "facility" ? "#f59e0b" :
    event.type === "cable" ? "#22d3ee" :
    event.type === "camera" ? "#94a3b8" :
    event.type === "conflict" ? "#fb7185" : "#34d399";

  return L.divIcon({
    html: `
      <div class="intel-marker ${selected ? "is-selected" : ""}" style="--marker-color:${color}">
        ${renderToString(iconForEvent(event.type))}
      </div>
    `,
    className: "intel-div-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

function gibsUrl(region: RegionPreset, layerIndex: number, date: string) {
  const [west, south, east, north] = region.bbox;
  const layer = GIBS_LAYERS[layerIndex];
  const bbox = `${west},${south},${east},${north}`;
  return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${layer.layer}&FORMAT=${layer.format}&WIDTH=1400&HEIGHT=900&CRS=CRS:84&BBOX=${bbox}&TIME=${date}`;
}

function DraggablePanel({ title, onClose, children, defaultPos, defaultSize }: {
  title: string;
  onClose: () => void;
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
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const onMove = (ev: MouseEvent) => {
      if (dragging.current) setPos({ x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  const toggleMaximize = () => {
    if (maximized) {
      setPos(prevState.pos);
      setSize(prevState.size);
      setMaximized(false);
    } else {
      setPrevState({ pos, size });
      setPos({ x: 12, y: 64 });
      setSize({ w: Math.max(420, window.innerWidth - 460), h: Math.max(320, window.innerHeight - 160) });
      setMaximized(true);
    }
  };

  const actualPos = maximized ? { x: 12, y: 64 } : pos;
  const actualSize = maximized ? { w: Math.max(420, window.innerWidth - 460), h: Math.max(320, window.innerHeight - 160) } : size;

  return (
    <div
      className="intel-panel"
      style={{ left: actualPos.x, top: actualPos.y, width: actualSize.w, height: actualSize.h, resize: maximized ? "none" : "both" }}
    >
      <div onMouseDown={onMouseDown} className="intel-panel__bar">
        <span>{title}</span>
        <div className="flex items-center gap-1">
          <button onClick={toggleMaximize} className="icon-button small" title={maximized ? "Restore" : "Maximize"}>
            {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onClose} className="icon-button small" title="Close"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="intel-panel__body">{children}</div>
    </div>
  );
}

function MapController({ region, focus }: { region: RegionPreset; focus?: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(region.center, region.zoom, { duration: 0.8 });
  }, [map, region]);

  useEffect(() => {
    if (focus) map.flyTo(focus, Math.max(map.getZoom(), 9), { duration: 0.7 });
  }, [focus, map]);

  return null;
}

interface SearchResult {
  id: string | number;
  label: string;
  lat: number;
  lng: number;
  type?: string;
}

interface IntelMapProps {
  apiBase: string;
  events: IntelligenceEvent[];
  selectedEvent: IntelligenceEvent | null;
  onEventClick: (event: IntelligenceEvent) => void;
  region: RegionPreset;
  showBorders: boolean;
}

export default function IntelMap({ apiBase, events, selectedEvent, onEventClick, region, showBorders }: IntelMapProps) {
  const [showVesselLayer, setShowVesselLayer] = useState(false);
  const [showFlightLayer, setShowFlightLayer] = useState(false);
  const [showSatellitePanel, setShowSatellitePanel] = useState(false);
  const [showGibsPanel, setShowGibsPanel] = useState(false);
  const [showJammingPanel, setShowJammingPanel] = useState(false);
  const [gibsLayer, setGibsLayer] = useState(0);
  const [gibsDate, setGibsDate] = useState(new Date(Date.now() - 86400000).toISOString().split("T")[0]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchEvents, setSearchEvents] = useState<IntelligenceEvent[]>([]);
  const [searchMode, setSearchMode] = useState<"place" | "near">("place");
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [searching, setSearching] = useState(false);

  const allEvents = useMemo(() => [...events, ...searchEvents], [events, searchEvents]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      if (searchMode === "near" && selectedEvent) {
        const params = new URLSearchParams({
          q: query,
          lat: String(selectedEvent.lat),
          lng: String(selectedEvent.lng),
          radius: "50000",
        });
        const resp = await fetch(`${apiBase}/api/osm-search?${params.toString()}`);
        const data = await resp.json();
        setSearchEvents(data.events || []);
        setResults([]);
      } else {
        const params = new URLSearchParams({ q: query, region: region.key });
        const resp = await fetch(`${apiBase}/api/search?${params.toString()}`);
        const data = await resp.json();
        setResults(data.results || []);
      }
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (result: SearchResult) => {
    setFocus([result.lat, result.lng]);
    setResults([]);
    const event: IntelligenceEvent = {
      id: `search-${result.id}`,
      type: "infrastructure",
      lat: result.lat,
      lng: result.lng,
      label: result.label,
      intensity: 0.4,
      details: `OSM place search result. Type: ${result.type || "place"}`,
      timestamp: new Date().toISOString(),
      sourceLayer: "osmSearch",
    };
    setSearchEvents([event]);
    onEventClick(event);
  };

  const tileCenter = `${region.center[0]}&lon=${region.center[1]}`;

  return (
    <div className="relative w-full h-full bg-[#0b1118]">
      {showGibsPanel && (
        <DraggablePanel title={`NASA GIBS imagery - ${region.label}`} onClose={() => setShowGibsPanel(false)} defaultPos={{ x: 64, y: 88 }} defaultSize={{ w: 620, h: 460 }}>
          <div className="panel-toolbar">
            {GIBS_LAYERS.map((layer, i) => (
              <button key={layer.id} onClick={() => setGibsLayer(i)} className={gibsLayer === i ? "segmented is-active" : "segmented"}>
                {layer.name}
              </button>
            ))}
            <input type="date" value={gibsDate} onChange={(e) => setGibsDate(e.target.value)} max={new Date().toISOString().split("T")[0]} className="date-input" />
          </div>
          <div className="h-full overflow-auto bg-black">
            <img src={gibsUrl(region, gibsLayer, gibsDate)} alt="NASA GIBS imagery" className="min-w-full" />
          </div>
        </DraggablePanel>
      )}

      {showJammingPanel && (
        <DraggablePanel title="GPS jamming monitor" onClose={() => setShowJammingPanel(false)} defaultPos={{ x: 560, y: 88 }} defaultSize={{ w: 520, h: 420 }}>
          <iframe src={`https://gpsjam.org/?lat=${tileCenter}&z=${region.zoom + 1}`} className="w-full h-full border-0" title="GPS jamming" />
        </DraggablePanel>
      )}

      {showSatellitePanel && (
        <DraggablePanel title="Satellite tracker" onClose={() => setShowSatellitePanel(false)} defaultPos={{ x: 300, y: 110 }} defaultSize={{ w: 520, h: 420 }}>
          <iframe src="https://www.n2yo.com/passes/?s=25544" className="w-full h-full border-0" title="Live satellites" />
        </DraggablePanel>
      )}

      {showVesselLayer && (
        <div className="absolute inset-0 z-[850] pointer-events-none">
          <iframe
            src={`https://www.vesselfinder.com/aismap?zoom=${Math.max(3, region.zoom + 1)}&lat=${tileCenter}&width=100%25&height=100%25&names=true&fleet=false`}
            className="w-full h-full border-0"
            style={{ mixBlendMode: "screen", opacity: 0.72 }}
            title="AIS vessel overlay"
          />
        </div>
      )}

      {showFlightLayer && (
        <div className="absolute inset-0 z-[840] pointer-events-none">
          <iframe
            src={`https://globe.adsbexchange.com/?lat=${tileCenter}&zoom=${Math.max(3, region.zoom + 1)}`}
            className="w-full h-full border-0"
            style={{ mixBlendMode: "screen", opacity: 0.76 }}
            title="ADS-B flight overlay"
          />
        </div>
      )}

      <div className="map-search">
        <div className="map-search__box">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder={searchMode === "place" ? "Search place, address, flight area" : "Search OSM near selected item"}
          />
          <button onClick={runSearch} className="text-button">{searching ? "Searching" : "Search"}</button>
        </div>
        <div className="map-search__modes">
          <button onClick={() => setSearchMode("place")} className={searchMode === "place" ? "segmented is-active" : "segmented"}>Place</button>
          <button onClick={() => setSearchMode("near")} disabled={!selectedEvent} className={searchMode === "near" ? "segmented is-active" : "segmented"}>Near selected</button>
        </div>
        {results.length > 0 && (
          <div className="map-search__results">
            {results.map((result) => (
              <button key={result.id} onClick={() => selectResult(result)}>
                <span>{result.label}</span>
                <small>{result.type || "place"}</small>
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

      <MapContainer center={region.center} zoom={region.zoom} className="w-full h-full" zoomControl={false} worldCopyJump>
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
        {allEvents.map((event) => {
          const selected = selectedEvent?.id === event.id;
          const color = event.intensity > 0.78 ? "#ef4444" :
            event.type === "vessel" ? "#38bdf8" :
            event.type === "satellite" ? "#a78bfa" :
            event.type === "conflict" ? "#fb7185" : "#34d399";
          return (
            <React.Fragment key={event.id}>
              <Marker position={[event.lat, event.lng]} icon={createIntelIcon(event, selected)} eventHandlers={{ click: () => onEventClick(event) }}>
                <Popup>
                  <div className="popup-card">
                    <div className="popup-card__title">{event.label}</div>
                    <div className="popup-card__meta">{event.type} / {new Date(event.timestamp).toLocaleString()}</div>
                    <div className="popup-card__body">{event.details}</div>
                  </div>
                </Popup>
              </Marker>
              {event.path && event.path.length > 1 && (
                <Polyline positions={event.path} pathOptions={{ color, weight: 1.5, opacity: 0.65, dashArray: "5, 8" }} />
              )}
              {event.intensity > 0.6 && (
                <Circle
                  center={[event.lat, event.lng]}
                  radius={26000 * event.intensity}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.09, weight: 1, dashArray: "5, 7" }}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      <div className="map-toolbar">
        <div className="map-toolbar__status">
          <span>{region.label}</span>
          <small>{allEvents.length} plotted</small>
        </div>
        <button onClick={() => setShowGibsPanel(!showGibsPanel)} className={showGibsPanel ? "tool-toggle is-active" : "tool-toggle"} title="NASA GIBS imagery">
          <Orbit className="w-4 h-4" /> Imagery
        </button>
        <button onClick={() => setShowVesselLayer(!showVesselLayer)} className={showVesselLayer ? "tool-toggle is-active" : "tool-toggle"} title="AIS overlay">
          <Ship className="w-4 h-4" /> AIS
        </button>
        <button onClick={() => setShowFlightLayer(!showFlightLayer)} className={showFlightLayer ? "tool-toggle is-active" : "tool-toggle"} title="ADS-B overlay">
          <Plane className="w-4 h-4" /> ADS-B
        </button>
        <button onClick={() => setShowSatellitePanel(!showSatellitePanel)} className={showSatellitePanel ? "tool-toggle is-active" : "tool-toggle"} title="Satellite tracker">
          <Orbit className="w-4 h-4" /> SAT
        </button>
        <button onClick={() => setShowJammingPanel(!showJammingPanel)} className={showJammingPanel ? "tool-toggle is-active" : "tool-toggle"} title="GPS jamming">
          <Radio className="w-4 h-4" /> GPS
        </button>
        <button className="tool-toggle" title="Use the layer panel on the left to enable OSM plugins">
          <Info className="w-4 h-4" /> Plugins
        </button>
      </div>
    </div>
  );
}

