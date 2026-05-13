import { getRegion } from './_regions.js';

export default async function handler(req, res) {
  const q = String(req.query?.q || '').trim();
  if (!q) return res.json({ results: [] });

  try {
    const region = getRegion(req);
    const [west, south, east, north] = region.bbox;
    const params = new URLSearchParams({
      format: 'jsonv2',
      q,
      limit: '8',
      addressdetails: '1',
    });
    if (region.key !== 'global') {
      params.set('viewbox', `${west},${north},${east},${south}`);
      params.set('bounded', '1');
    }

    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'User-Agent': 'OPHANIM-V1' },
    });
    const data = await resp.json();
    res.json({
      results: (data || []).map((item) => ({
        id: item.place_id,
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        type: item.type || item.class,
      })),
    });
  } catch (err) {
    res.json({ results: [] });
  }
}

