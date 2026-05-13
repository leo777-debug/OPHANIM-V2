import { getRegion, overpassBbox } from './_regions.js';

const layerQueries = {
  cameras: {
    type: 'camera',
    label: 'Camera',
    query: (bbox) => `nwr["man_made"="surveillance"](${bbox});`,
  },
  nuclear: {
    type: 'facility',
    label: 'Nuclear facility',
    query: (bbox) => `
      nwr["generator:source"="nuclear"](${bbox});
      nwr["plant:source"="nuclear"](${bbox});
      nwr["power"="plant"]["plant:source"="nuclear"](${bbox});
    `,
  },
  cables: {
    type: 'cable',
    label: 'Undersea cable',
    query: (bbox) => `
      way["telecom"="cable"]["submarine"="yes"](${bbox});
      way["communication"="cable"]["location"~"underwater|undersea|submarine"](${bbox});
    `,
  },
  militaryBases: {
    type: 'facility',
    label: 'Military site',
    query: (bbox) => `
      nwr["military"="base"](${bbox});
      nwr["landuse"="military"](${bbox});
    `,
  },
  embassies: {
    type: 'facility',
    label: 'Embassy',
    query: (bbox) => `nwr["amenity"="embassy"](${bbox});`,
  },
  volcanoes: {
    type: 'infrastructure',
    label: 'Volcano',
    query: (bbox) => `nwr["natural"="volcano"](${bbox});`,
  },
  seaports: {
    type: 'infrastructure',
    label: 'Seaport',
    query: (bbox) => `
      nwr["harbour"="yes"](${bbox});
      nwr["industrial"="port"](${bbox});
      nwr["seamark:type"="harbour"](${bbox});
    `,
  },
  lighthouses: {
    type: 'infrastructure',
    label: 'Lighthouse',
    query: (bbox) => `
      nwr["man_made"="lighthouse"](${bbox});
      nwr["seamark:type"="light_major"](${bbox});
    `,
  },
  spaceports: {
    type: 'infrastructure',
    label: 'Spaceport',
    query: (bbox) => `
      nwr["aerospace"="spaceport"](${bbox});
      nwr["aeroway"="spaceport"](${bbox});
      nwr["spaceport"="yes"](${bbox});
    `,
  },
  airports: {
    type: 'airport',
    label: 'Airport',
    query: (bbox) => `nwr["aeroway"="aerodrome"](${bbox});`,
  },
};

function elementCenter(element) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return [element.lat, element.lon];
  }
  if (element.center) return [element.center.lat, element.center.lon];
  if (Array.isArray(element.geometry) && element.geometry.length > 0) {
    const first = element.geometry[0];
    return [first.lat, first.lon];
  }
  return null;
}

function toEvent(element, layer, config) {
  const center = elementCenter(element);
  if (!center) return null;
  const tags = element.tags || {};
  const name = tags.name || tags['name:en'] || `${config.label} ${element.id}`;
  return {
    id: `osm-${layer}-${element.type}-${element.id}`,
    type: config.type,
    lat: center[0],
    lng: center[1],
    label: name,
    intensity: layer === 'militaryBases' || layer === 'nuclear' ? 0.65 : 0.35,
    details: `${config.label}. OSM tags: ${Object.entries(tags).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    timestamp: new Date().toISOString(),
    sourceLayer: layer,
  };
}

export default async function handler(req, res) {
  const layer = String(req.query?.layer || '');
  const config = layerQueries[layer];
  if (!config) return res.status(400).json({ events: [], error: 'Unknown OSM layer' });

  try {
    const region = getRegion(req);
    const bbox = overpassBbox(region);
    const query = `[out:json][timeout:25];(${config.query(bbox)});out center 180;`;
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'OPHANIM-V1',
      },
      body: new URLSearchParams({ data: query }),
    });
    const data = await resp.json();
    const events = (data.elements || [])
      .map((element) => toEvent(element, layer, config))
      .filter(Boolean);
    res.json({ events });
  } catch (err) {
    res.json({ events: [] });
  }
}

