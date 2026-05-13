const tagKeys = '^(name|amenity|military|aeroway|man_made|power|natural|industrial|harbour|office|diplomatic)$';

function cleanPattern(value) {
  return String(value || '')
    .replace(/[^a-z0-9 _-]/gi, '')
    .trim()
    .slice(0, 60);
}

function elementCenter(element) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return [element.lat, element.lon];
  }
  if (element.center) return [element.center.lat, element.center.lon];
  return null;
}

export default async function handler(req, res) {
  const q = cleanPattern(req.query?.q);
  const lat = Number(req.query?.lat);
  const lng = Number(req.query?.lng);
  const radius = Math.min(Number(req.query?.radius || 50000), 250000);
  if (!q || Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.json({ events: [] });
  }

  try {
    const query = `[out:json][timeout:25];(
      nwr(around:${radius},${lat},${lng})["name"~"${q}",i];
      nwr(around:${radius},${lat},${lng})[~"${tagKeys}"~"${q}",i];
    );out center 120;`;

    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'OPHANIM-V1',
      },
      body: new URLSearchParams({ data: query }),
    });
    const data = await resp.json();
    const events = (data.elements || []).map((element) => {
      const center = elementCenter(element);
      if (!center) return null;
      const tags = element.tags || {};
      return {
        id: `osm-search-${element.type}-${element.id}`,
        type: 'infrastructure',
        lat: center[0],
        lng: center[1],
        label: tags.name || tags.amenity || tags.military || `OSM ${element.id}`,
        intensity: 0.45,
        details: `OSM proximity result within ${Math.round(radius / 1000)} km. Tags: ${Object.entries(tags).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(', ')}`,
        timestamp: new Date().toISOString(),
        sourceLayer: 'osmSearch',
      };
    }).filter(Boolean);
    res.json({ events });
  } catch (err) {
    res.json({ events: [] });
  }
}
