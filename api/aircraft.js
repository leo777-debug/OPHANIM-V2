import { getRegion } from './_regions.js';

export default async function handler(req, res) {
  try {
    const region = getRegion(req);
    const user = process.env.OPENSKY_USER || '';
    const pass = process.env.OPENSKY_PASS || '';
    const headers = user ? { 'Authorization': 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64') } : {};
    const [west, south, east, north] = region.bbox;
    const query = region.key === 'global'
      ? ''
      : `?lamin=${south}&lomin=${west}&lamax=${north}&lomax=${east}`;
    const resp = await fetch(`https://opensky-network.org/api/states/all${query}`, { headers });
    const data = await resp.json();
    const ac = (data.states || [])
      .filter((s) => s[6] && s[5])
      .map((s) => ({
        hex: s[0],
        flight: s[1]?.trim() || '',
        lat: s[6],
        lon: s[5],
        alt_baro: s[7],
        gs: s[9],
        squawk: s[14] || '',
        t: ''
      }));
    res.json({ ac });
  } catch (err) {
    res.json({ ac: [] });
  }
}
