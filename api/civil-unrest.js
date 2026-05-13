import { getRegion, inRegion } from './_regions.js';

export default async function handler(req, res) {
  try {
    const region = getRegion(req);
    const resp = await fetch('https://api.gdeltproject.org/api/v2/geo/geo?query=protest+OR+riot+OR+unrest+OR+demonstration&TIMESPAN=1440&MAXROWS=50&OUTPUTTYPE=2&FORMAT=GeoJSON', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const data = await resp.json();
    if (region.key !== 'global' && data.features) {
      data.features = data.features.filter((f) => {
        const coords = f.geometry?.coordinates;
        return coords && inRegion(region, coords[1], coords[0]);
      });
    }
    res.json(data);
  } catch (err) {
    res.json({ features: [] });
  }
}

