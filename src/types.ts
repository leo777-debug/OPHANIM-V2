export interface IntelligenceEvent {
  id: string;
  type:
    | "vessel"
    | "aircraft"
    | "conflict"
    | "news"
    | "satellite"
    | "facility"
    | "camera"
    | "cable"
    | "airport"
    | "infrastructure";
  lat: number;
  lng: number;
  label: string;
  intensity: number; // 0-1
  details: string;
  timestamp: string;
  path?: [number, number][];
  sourceLayer?: string;
  heading?: number; // degrees 0-360
  speed?: number;   // knots or km/h
  altitude?: number;
  mmsi?: string;
  icao?: string;
  squawk?: string;
  country?: string;
}

export interface AnalysisResult {
  threat_score: number;
  threat_level: "GREEN" | "YELLOW" | "ORANGE" | "RED" | "BLACK";
  evidence: string[];
  recommendation: string;
  summary: string;
  timestamp: string;
  gps_jamming_detected?: boolean;
  maritime_anomalies?: string[];
  aerial_anomalies?: string[];
  seismic_analysis?: string;
  imagery_analysis?: string;
  gibs_analyzed?: boolean;
  prediction?: string;
  pattern_match?: string;
  factors?: { label: string; contribution: number; detail: string }[];
  new_lesson?: {
    title: string;
    lesson: string;
    context: string;
  };
}

export interface CognitionLesson {
  id: string;
  title: string;
  lesson: string;
  context: string;
  timestamp?: string;
  region?: string;
  threat_score?: number;
}

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}
