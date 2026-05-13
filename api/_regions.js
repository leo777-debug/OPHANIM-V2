export const REGIONS = {
  global: {
    bbox: [-180, -70, 180, 85],
    center: [20, 0],
    news: "global security OR maritime OR aviation OR conflict OR protest",
  },
  americas: {
    bbox: [-170, -56, -30, 72],
    center: [18, -78],
    news: "Americas security OR maritime OR aviation OR conflict OR protest",
  },
  europe: {
    bbox: [-25, 34, 45, 72],
    center: [52, 15],
    news: "Europe security OR maritime OR aviation OR conflict OR protest",
  },
  mena: {
    bbox: [-18, 10, 75, 45],
    center: [27, 44],
    news: "MENA security OR maritime OR aviation OR conflict",
  },
  asia: {
    bbox: [45, -10, 180, 78],
    center: [30, 95],
    news: "Asia security OR maritime OR aviation OR conflict OR protest",
  },
  africa: {
    bbox: [-20, -35, 55, 38],
    center: [2, 20],
    news: "Africa security OR maritime OR aviation OR conflict OR protest",
  },
  oceania: {
    bbox: [110, -50, 180, 8],
    center: [-23, 142],
    news: "Oceania security OR maritime OR aviation OR conflict OR protest",
  },
  arctic: {
    bbox: [-180, 60, 180, 85],
    center: [72, 0],
    news: "Arctic security OR maritime OR aviation OR infrastructure",
  },
};

export function getRegion(req) {
  const key = String(req.query?.region || "global").toLowerCase();
  return REGIONS[key] ? { key, ...REGIONS[key] } : { key: "global", ...REGIONS.global };
}

export function inRegion(region, lat, lng) {
  if (region.key === "global") return true;
  const [west, south, east, north] = region.bbox;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function overpassBbox(region) {
  const [west, south, east, north] = region.bbox;
  return `${south},${west},${north},${east}`;
}

