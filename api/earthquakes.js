import { getRegion, inRegion } from './_regions.js';

export default async function handler(req, res) {
  try {
    const region = getRegion(req);
    const resp = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
    const data = await resp.json();
    if (region.key !== 'global' && data.features) {
      data.features = data.features.filter((f) => {
        const [lng, lat] = f.geometry.coordinates;
        return inRegion(region, lat, lng);
      });
    }
    res.json(data);
  } catch (err) {
    res.json({ features: [] });
  }
}
