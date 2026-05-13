const REGIONS = {
  global: { bbox: [-180, -70, 180, 85], center: [20, 0], news: "global security OR maritime OR aviation OR conflict OR protest" },
  americas: { bbox: [-170, -56, -30, 72], center: [18, -78], news: "Americas security OR maritime OR aviation OR conflict OR protest" },
  europe: { bbox: [-25, 34, 45, 72], center: [52, 15], news: "Europe security OR maritime OR aviation OR conflict OR protest" },
  mena: { bbox: [-18, 10, 75, 45], center: [27, 44], news: "MENA security OR maritime OR aviation OR conflict" },
  asia: { bbox: [45, -10, 180, 78], center: [30, 95], news: "Asia security OR maritime OR aviation OR conflict OR protest" },
  africa: { bbox: [-20, -35, 55, 38], center: [2, 20], news: "Africa security OR maritime OR aviation OR conflict OR protest" },
  oceania: { bbox: [110, -50, 180, 8], center: [-23, 142], news: "Oceania security OR maritime OR aviation OR conflict OR protest" },
  arctic: { bbox: [-180, 60, 180, 85], center: [72, 0], news: "Arctic security OR maritime OR aviation OR infrastructure" },
};

const osmLayerQueries = {
  cameras: { type: "camera", label: "Camera", query: (bbox) => `nwr["man_made"="surveillance"](${bbox});` },
  nuclear: {
    type: "facility",
    label: "Nuclear facility",
    query: (bbox) => `nwr["generator:source"="nuclear"](${bbox});nwr["plant:source"="nuclear"](${bbox});nwr["power"="plant"]["plant:source"="nuclear"](${bbox});`,
  },
  cables: {
    type: "cable",
    label: "Undersea cable",
    query: (bbox) => `way["telecom"="cable"]["submarine"="yes"](${bbox});way["communication"="cable"]["location"~"underwater|undersea|submarine"](${bbox});`,
  },
  militaryBases: {
    type: "facility",
    label: "Military site",
    query: (bbox) => `nwr["military"="base"](${bbox});nwr["landuse"="military"](${bbox});`,
  },
  embassies: { type: "facility", label: "Embassy", query: (bbox) => `nwr["amenity"="embassy"](${bbox});` },
  volcanoes: { type: "infrastructure", label: "Volcano", query: (bbox) => `nwr["natural"="volcano"](${bbox});` },
  seaports: {
    type: "infrastructure",
    label: "Seaport",
    query: (bbox) => `nwr["harbour"="yes"](${bbox});nwr["industrial"="port"](${bbox});nwr["seamark:type"="harbour"](${bbox});`,
  },
  lighthouses: {
    type: "infrastructure",
    label: "Lighthouse",
    query: (bbox) => `nwr["man_made"="lighthouse"](${bbox});nwr["seamark:type"="light_major"](${bbox});`,
  },
  spaceports: {
    type: "infrastructure",
    label: "Spaceport",
    query: (bbox) => `nwr["aerospace"="spaceport"](${bbox});nwr["aeroway"="spaceport"](${bbox});nwr["spaceport"="yes"](${bbox});`,
  },
  airports: { type: "airport", label: "Airport", query: (bbox) => `nwr["aeroway"="aerodrome"](${bbox});` },
};

function getRegion(req) {
  const key = String(req.query?.region || "global").toLowerCase();
  return REGIONS[key] ? { key, ...REGIONS[key] } : { key: "global", ...REGIONS.global };
}

function inRegion(region, lat, lng) {
  if (region.key === "global") return true;
  const [west, south, east, north] = region.bbox;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

function overpassBbox(region) {
  const [west, south, east, north] = region.bbox;
  return `${south},${west},${north},${east}`;
}

function elementCenter(element) {
  if (typeof element.lat === "number" && typeof element.lon === "number") return [element.lat, element.lon];
  if (element.center) return [element.center.lat, element.center.lon];
  if (Array.isArray(element.geometry) && element.geometry.length > 0) return [element.geometry[0].lat, element.geometry[0].lon];
  return null;
}

function toOsmEvent(element, layer, config) {
  const center = elementCenter(element);
  if (!center) return null;
  const tags = element.tags || {};
  const name = tags.name || tags["name:en"] || `${config.label} ${element.id}`;
  return {
    id: `osm-${layer}-${element.type}-${element.id}`,
    type: config.type,
    lat: center[0],
    lng: center[1],
    label: name,
    intensity: layer === "militaryBases" || layer === "nuclear" ? 0.65 : 0.35,
    details: `${config.label}. OSM tags: ${Object.entries(tags).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(", ")}`,
    timestamp: new Date().toISOString(),
    sourceLayer: layer,
  };
}

async function jsonFetch(url, options) {
  const resp = await fetch(url, options);
  return resp.json();
}

async function feedAircraft(req, res, militaryOnly = false) {
  try {
    const region = getRegion(req);
    if (militaryOnly) {
      const data = await jsonFetch("https://api.adsb.lol/v2/mil", { headers: { "User-Agent": "OPHANIM-V1" } });
      const ac = (data.ac || [])
        .filter((a) => a.lat && (a.lon || a.lng))
        .filter((a) => inRegion(region, Number(a.lat), Number(a.lon ?? a.lng)))
        .map((a) => ({
          hex: a.hex,
          flight: a.flight?.trim() || a.r || a.hex,
          lat: Number(a.lat),
          lon: Number(a.lon ?? a.lng),
          alt_baro: a.alt_baro ?? a.alt_geom,
          gs: a.gs,
          squawk: a.squawk || "",
          t: a.t || "MIL",
        }));
      return res.json({ ac });
    }

    const user = process.env.OPENSKY_USER || "";
    const pass = process.env.OPENSKY_PASS || "";
    const headers = user ? { Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") } : {};
    const [west, south, east, north] = region.bbox;
    const query = region.key === "global" ? "" : `?lamin=${south}&lomin=${west}&lamax=${north}&lomax=${east}`;
    const data = await jsonFetch(`https://opensky-network.org/api/states/all${query}`, { headers });
    const ac = (data.states || []).filter((s) => s[6] && s[5]).map((s) => ({
      hex: s[0],
      flight: s[1]?.trim() || "",
      lat: s[6],
      lon: s[5],
      alt_baro: s[7],
      gs: s[9],
      squawk: s[14] || "",
      t: "",
    }));
    return res.json({ ac });
  } catch (err) {
    return res.json({ ac: [] });
  }
}

async function feedOsm(req, res) {
  const layer = String(req.query?.layer || "");
  const config = osmLayerQueries[layer];
  if (!config) return res.status(400).json({ events: [], error: "Unknown OSM layer" });
  try {
    const region = getRegion(req);
    const query = `[out:json][timeout:25];(${config.query(overpassBbox(region))});out center 180;`;
    const data = await jsonFetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "OPHANIM-V1" },
      body: new URLSearchParams({ data: query }),
    });
    res.json({ events: (data.elements || []).map((el) => toOsmEvent(el, layer, config)).filter(Boolean) });
  } catch (err) {
    res.json({ events: [] });
  }
}

async function feedOsmSearch(req, res) {
  const q = String(req.query?.q || "").replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 60);
  const lat = Number(req.query?.lat);
  const lng = Number(req.query?.lng);
  const radius = Math.min(Number(req.query?.radius || 50000), 250000);
  if (!q || Number.isNaN(lat) || Number.isNaN(lng)) return res.json({ events: [] });

  try {
    const tagKeys = "^(name|amenity|military|aeroway|man_made|power|natural|industrial|harbour|office|diplomatic)$";
    const query = `[out:json][timeout:25];(nwr(around:${radius},${lat},${lng})["name"~"${q}",i];nwr(around:${radius},${lat},${lng})[~"${tagKeys}"~"${q}",i];);out center 120;`;
    const data = await jsonFetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "OPHANIM-V1" },
      body: new URLSearchParams({ data: query }),
    });
    const events = (data.elements || []).map((element) => {
      const center = elementCenter(element);
      if (!center) return null;
      const tags = element.tags || {};
      return {
        id: `osm-search-${element.type}-${element.id}`,
        type: "infrastructure",
        lat: center[0],
        lng: center[1],
        label: tags.name || tags.amenity || tags.military || `OSM ${element.id}`,
        intensity: 0.45,
        details: `OSM proximity result within ${Math.round(radius / 1000)} km. Tags: ${Object.entries(tags).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(", ")}`,
        timestamp: new Date().toISOString(),
        sourceLayer: "osmSearch",
      };
    }).filter(Boolean);
    res.json({ events });
  } catch (err) {
    res.json({ events: [] });
  }
}

async function feedPlaceSearch(req, res) {
  const q = String(req.query?.q || "").trim();
  if (!q) return res.json({ results: [] });
  try {
    const region = getRegion(req);
    const [west, south, east, north] = region.bbox;
    const params = new URLSearchParams({ format: "jsonv2", q, limit: "8", addressdetails: "1" });
    if (region.key !== "global") {
      params.set("viewbox", `${west},${north},${east},${south}`);
      params.set("bounded", "1");
    }
    const data = await jsonFetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { "User-Agent": "OPHANIM-V1" },
    });
    res.json({ results: (data || []).map((item) => ({ id: item.place_id, label: item.display_name, lat: Number(item.lat), lng: Number(item.lon), type: item.type || item.class })) });
  } catch (err) {
    res.json({ results: [] });
  }
}

export default async function handler(req, res) {
  const feed = String(req.query?.feed || "");
  const region = getRegion(req);

  try {
    if (feed === "aircraft") return feedAircraft(req, res, false);
    if (feed === "military-aircraft") return feedAircraft(req, res, true);
    if (feed === "osm") return feedOsm(req, res);
    if (feed === "osm-search") return feedOsmSearch(req, res);
    if (feed === "search") return feedPlaceSearch(req, res);
    if (feed === "cognition") return res.json([]);

    if (feed === "news") {
      const query = encodeURIComponent(region.news);
      const data = await jsonFetch(`https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`);
      return res.json(data);
    }

    if (feed === "nasa") {
      const data = await jsonFetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=10");
      return res.json(data);
    }

    if (feed === "earthquakes") {
      const data = await jsonFetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
      if (region.key !== "global" && data.features) {
        data.features = data.features.filter((f) => {
          const [lng, lat] = f.geometry.coordinates;
          return inRegion(region, lat, lng);
        });
      }
      return res.json(data);
    }

    if (feed === "conflicts" || feed === "civil-unrest") {
      const q = feed === "civil-unrest"
        ? "protest+OR+riot+OR+unrest+OR+demonstration"
        : "attack+OR+explosion+OR+airstrike";
      const data = await jsonFetch(`https://api.gdeltproject.org/api/v2/geo/geo?query=${q}&TIMESPAN=1440&MAXROWS=50&OUTPUTTYPE=2&FORMAT=GeoJSON`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (region.key !== "global" && data.features) {
        data.features = data.features.filter((f) => {
          const coords = f.geometry?.coordinates;
          return coords && inRegion(region, coords[1], coords[0]);
        });
      }
      return res.json(data);
    }

    if (feed === "firms") {
      const resp = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${process.env.NASA_API_KEY}/VIIRS_SNPP_NRT/world/1`);
      const text = await resp.text();
      res.setHeader("Content-Type", "text/plain");
      return res.send(text);
    }

    if (feed === "satellites") {
      const [lat, lng] = region.center;
      const category = req.query?.category || 52;
      const data = await jsonFetch(`https://api.n2yo.com/rest/v1/satellite/above/${lat}/${lng}/0/70/${category}/&apiKey=${process.env.N2YO_API_KEY}`);
      return res.json(data);
    }

    if (feed === "jamming") {
      const today = new Date().toISOString().split("T")[0];
      const resp = await fetch(`https://gpsjam.org/api/v1/jams?date=${today}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      const text = await resp.text();
      return res.json(text.startsWith("<") ? { jams: [] } : JSON.parse(text));
    }

    if (feed === "blackouts") {
      const from = Math.floor(Date.now() / 1000) - 86400;
      const until = Math.floor(Date.now() / 1000);
      const data = await jsonFetch(`https://api.ioda.caida.org/v2/outages/alerts?from=${from}&until=${until}&limit=20`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      return res.json(data);
    }

    if (feed === "ships") {
      const [west, south, east, north] = region.bbox;
      const resp = await fetch(`https://www.vesselfinder.com/api/pub/vesselsonmap?bbox=${west},${south},${east},${north}&zoom=4&show_names=1`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", Referer: "https://www.vesselfinder.com", Accept: "application/json" },
      });
      const text = await resp.text();
      return res.json(text.startsWith("<") ? [] : JSON.parse(text));
    }

    return res.status(400).json({ error: "Unknown feed" });
  } catch (err) {
    return res.json(feed === "firms" ? "" : {});
  }
}

