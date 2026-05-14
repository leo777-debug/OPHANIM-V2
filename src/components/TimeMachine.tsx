import React, { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { IntelligenceEvent } from "../types";
import { Clock } from "lucide-react";

interface TimeMachineProps {
  onHistoricalData: (events: IntelligenceEvent[] | null) => void;
  onLoadStart?: () => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
}

export default function TimeMachine({ onHistoricalData, onLoadStart, isLive, setIsLive }: TimeMachineProps) {
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const [value, setValue] = useState(now);
  const [label, setLabel] = useState("Live");

  const fetchHistorical = useCallback(async (timestamp: number) => {
    if (onLoadStart) onLoadStart();
    const from = new Date(timestamp - 10 * 60 * 1000).toISOString();
    const to   = new Date(timestamp + 10 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('event_history')
      .select('*')
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .limit(200);

    if (error || !data || data.length === 0) {
      onHistoricalData([]);
      return;
    }

    const events: IntelligenceEvent[] = data.map((row: any) => ({
      id:        row.asset_id,
      type:      row.asset_type,
      lat:       row.lat,
      lng:       row.lng,
      label:     row.label || row.asset_id,
      intensity: row.intensity || 0.5,
      details:   row.details || '',
      timestamp: row.recorded_at,
    }));

    onHistoricalData(events);
  }, [onHistoricalData, onLoadStart]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ts = Number(e.target.value);
    setValue(ts);
    const live = ts >= now - 90000;
    setIsLive(live);
    if (live) {
      setLabel("Live");
      onHistoricalData(null);
    } else {
      const d = new Date(ts);
      setLabel(d.toUTCString().slice(5, 22));
      fetchHistorical(ts);
    }
  };

  const goLive = () => {
    setValue(now);
    setIsLive(true);
    setLabel("Live");
    onHistoricalData(null);
  };

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(22,27,34,0.97)', border: '1px solid #30363d',
      borderRadius: 8, padding: '10px 16px', zIndex: 1000,
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: "'Inter', system-ui, sans-serif", minWidth: 500, maxWidth: 700,
      boxShadow: '0 4px 24px #00000088'
    }}>
      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: '#58a6ff' }} />
      <span style={{ fontSize: 11, color: isLive ? '#3fb950' : '#58a6ff', fontWeight: 600, minWidth: 140 }}>
        {isLive ? '● Live' : `⏱ ${label}`}
      </span>
      <input
        type="range"
        min={now - WINDOW_MS}
        max={now}
        step={60000}
        value={value}
        onChange={handleChange}
        style={{ flex: 1, accentColor: '#58a6ff', cursor: 'pointer' }}
      />
      <span style={{ fontSize: 10, color: '#484f58', whiteSpace: 'nowrap' }}>−24h</span>
      <button onClick={goLive} style={{
        background: isLive ? '#1f6feb' : 'transparent',
        color: isLive ? '#fff' : '#58a6ff',
        border: '1px solid #1f6feb', borderRadius: 4,
        padding: '3px 10px', fontSize: 11, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap'
      }}>
        Go Live
      </button>
    </div>
  );
}
