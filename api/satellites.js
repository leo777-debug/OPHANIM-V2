import { getRegion } from './_regions.js';

export default async function handler(req, res) {
  try {
    const KEY = process.env.N2YO_API_KEY;
    const region = getRegion(req);
    const [lat, lng] = region.center;
    const category = req.query?.category || 52;
    const resp = await fetch(`https://api.n2yo.com/rest/v1/satellite/above/${lat}/${lng}/0/70/${category}/&apiKey=${KEY}`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error('N2YO error:', err.message);
    res.json({ above: [] });
  }
}
