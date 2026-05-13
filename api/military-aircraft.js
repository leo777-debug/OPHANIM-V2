import { getRegion, inRegion } from './_regions.js';

export default async function handler(req, res) {
  try {
    const region = getRegion(req);
    const resp = await fetch('https://api.adsb.lol/v2/mil', {
      headers: { 'User-Agent': 'OPHANIM-V1' },
    });
    const data = await resp.json();
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
        squawk: a.squawk || '',
        t: a.t || 'MIL',
      }));
    res.json({ ac });
  } catch (err) {
    res.json({ ac: [] });
  }
}

