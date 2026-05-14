import { useState } from "react";
import { Monitor, RefreshCw, Ship, Info, AlertTriangle, ArrowRight } from "lucide-react";

interface OperatorBriefingProps {
  onAcknowledge: () => void;
}

export default function OperatorBriefing({ onAcknowledge }: OperatorBriefingProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const briefingItems = [
    {
      icon: <Monitor className="w-6 h-6 text-cyan-400" />,
      title: "DISPLAY",
      content: "Press F11 for fullscreen. Recommended resolution 1440p+"
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-cyan-400" />,
      title: "REFRESH",
      content: "Click SYNC regularly for latest intel. Auto-refreshes every 60s."
    },
    {
      icon: <Ship className="w-6 h-6 text-cyan-400" />,
      title: "SHIPS + FLIGHTS",
      content: "Use overlay buttons (top right) to enable live AIS ships and ADS-B flights."
    },
    {
      icon: <Info className="w-6 h-6 text-cyan-400" />,
      title: "PANELS",
      content: "GIBS, GPS Jam, No-Fly panels are draggable and resizable."
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
      title: "ALERTS",
      content: "Threat score above 40% triggers audio alarm + popup alert."
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
      <div className="max-w-lg w-full border border-cyan-500/30 bg-zinc-950 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-8 text-center border-b border-zinc-800 shrink-0">
          <h1 className="text-3xl font-bold text-white tracking-widest">OPERATOR BRIEFING</h1>
          <p className="text-cyan-400/70 mt-2">OPHANIM-V2 ATLAS // MISSION READY</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
          {briefingItems.map((item, i) => (
            <div 
              key={i} 
              className="flex gap-5 p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-cyan-500/40 transition-colors"
            >
              <div className="mt-1 flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <div className="font-semibold text-white text-lg mb-1">{item.title}</div>
                <p className="text-zinc-400 text-[15px] leading-relaxed">
                  {item.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-zinc-800 bg-red-950/30 shrink-0">
          <div className="text-red-400 text-sm mb-5 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> 
            RESEARCH & EDUCATIONAL PURPOSES ONLY
          </div>

          <button
            onClick={() => {
              setAcknowledged(true);
              setTimeout(onAcknowledge, 300);
            }}
            disabled={acknowledged}
            className="w-full py-5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 
                       text-black font-bold text-lg tracking-widest rounded-xl flex items-center justify-center gap-3 
                       transition-all active:scale-95 disabled:opacity-70"
          >
            ACKNOWLEDGED — ENTER SYSTEM
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
