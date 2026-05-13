export type RegionKey =
  | "global"
  | "americas"
  | "europe"
  | "mena"
  | "asia"
  | "africa"
  | "oceania"
  | "arctic";

export interface RegionPreset {
  key: RegionKey;
  label: string;
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]];
  bbox: [number, number, number, number];
  query: string;
}

export const REGION_PRESETS: Record<RegionKey, RegionPreset> = {
  global: {
    key: "global",
    label: "Global",
    center: [20, 0],
    zoom: 2,
    bounds: [[-70, -180], [85, 180]],
    bbox: [-180, -70, 180, 85],
    query: "global security OR maritime OR aviation OR conflict OR protest",
  },
  americas: {
    key: "americas",
    label: "Americas",
    center: [18, -78],
    zoom: 3,
    bounds: [[-56, -170], [72, -30]],
    bbox: [-170, -56, -30, 72],
    query: "Americas security OR maritime OR aviation OR conflict OR protest",
  },
  europe: {
    key: "europe",
    label: "Europe",
    center: [52, 15],
    zoom: 4,
    bounds: [[34, -25], [72, 45]],
    bbox: [-25, 34, 45, 72],
    query: "Europe security OR maritime OR aviation OR conflict OR protest",
  },
  mena: {
    key: "mena",
    label: "MENA",
    center: [27, 44],
    zoom: 4,
    bounds: [[10, -18], [45, 75]],
    bbox: [-18, 10, 75, 45],
    query: "MENA security OR maritime OR aviation OR conflict",
  },
  asia: {
    key: "asia",
    label: "Asia",
    center: [30, 95],
    zoom: 3,
    bounds: [[-10, 45], [78, 180]],
    bbox: [45, -10, 180, 78],
    query: "Asia security OR maritime OR aviation OR conflict OR protest",
  },
  africa: {
    key: "africa",
    label: "Africa",
    center: [2, 20],
    zoom: 3,
    bounds: [[-35, -20], [38, 55]],
    bbox: [-20, -35, 55, 38],
    query: "Africa security OR maritime OR aviation OR conflict OR protest",
  },
  oceania: {
    key: "oceania",
    label: "Oceania",
    center: [-23, 142],
    zoom: 4,
    bounds: [[-50, 110], [8, 180]],
    bbox: [110, -50, 180, 8],
    query: "Oceania security OR maritime OR aviation OR conflict OR protest",
  },
  arctic: {
    key: "arctic",
    label: "Arctic",
    center: [72, 0],
    zoom: 3,
    bounds: [[60, -180], [85, 180]],
    bbox: [-180, 60, 180, 85],
    query: "Arctic security OR maritime OR aviation OR infrastructure",
  },
};

export const regionContains = (region: RegionPreset, lat: number, lng: number) => {
  if (region.key === "global") return true;
  const [[south, west], [north, east]] = region.bounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
};

