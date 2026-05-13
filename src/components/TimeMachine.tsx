import React, { useCallback, useState } from "react";
import { supabase } from "../lib/supabase";
import { IntelligenceEvent } from "../types";

interface TimeMachineProps {
  onHistoricalData: (events: IntelligenceEvent[] | null) => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
}

export default function TimeMachine({ onHistoricalData, isLive, setIsLive }: TimeMachineProps) {
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const [value, setValue] = useState(now);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("LIVE");

  const fetchHistorical = useCallback(async (timestamp: number) => {
    setLoading(true);
    const from = new Date(timestamp - 10 * 60 * 1000).toISOString();
    const to = new Date(timestamp + 10 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("event_history")
      .select("*")
      .gte("recorded_at", from)
      .lte("recorded_at", to)
      .limit(200);

    if (error || !data || data.length === 0) {
      onHistoricalData([]);
      setLabel("No history found for this window");
      setLoading(false);
      return;
    }

    const events: IntelligenceEvent[] = data.map((row: any) => ({
      id: row.asset_id,
      type: row.asset_type,
      lat: row.lat,
      lng: row.lng,
      label: row.label || row.asset_id,
      intensity: row.intensity || 0.5,
      details: row.details || "",
      timestamp: row.recorded_at,
    }));

    onHistoricalData(events);
    setLabel(new Date(timestamp).toUTCString().slice(0, 25));
    setLoading(false);
  }, [onHistoricalData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ts = Number(e.target.value);
    setValue(ts);
    const live = ts >= now - 90000;
    setIsLive(live);
    if (live) {
      setLabel("LIVE");
      onHistoricalData(null);
    } else {
      const d = new Date(ts);
      setLabel(`Loading history near ${d.toUTCString().slice(0, 25)}`);
      fetchHistorical(ts);
    }
  };

  const goLive = () => {
    setValue(now);
    setIsLive(true);
    setLabel("LIVE");
    onHistoricalData(null);
  };

  return (
    <div className="time-machine">
      <span className="time-machine__label">
        {loading ? "Past data can take time to load..." : label}
      </span>
      <input
        type="range"
        min={now - WINDOW_MS}
        max={now}
        step={60000}
        value={value}
        onChange={handleChange}
        className="time-machine__range"
      />
      <span className="time-machine__window">-24h</span>
      <button onClick={goLive} className={isLive ? "time-machine__button is-live" : "time-machine__button"}>
        LIVE
      </button>
    </div>
  );
}

