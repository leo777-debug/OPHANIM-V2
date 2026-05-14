import { useState } from "react";
import { Monitor, Shield, Wifi, ArrowRight, AlertTriangle } from "lucide-react";

interface PreFlightCheckProps {
  onAcknowledge: () => void;
}

export default function PreFlightCheck({ onAcknowledge }: PreFlightCheckProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const checks = [
    {
      icon: <Monitor className="w-6 h-6 text-cyan-400" />,
      title: "USE LAPTOP / MONITOR / BIG SCREEN",
      desc: "Mobile devices not supported. Minimum 1280px width recommended.",
    },
    {
      icon: <Shield className="w-6 h-6 text-amber-400" />,
      title: "DISABLE ALL AD BLOCKERS",
      desc: "Live data streams (ADS-B, AIS, FIRMS) will be blocked by uBlock, AdBlock, Brave Shield, etc.",
    },
    {
      icon: <Wifi className="w-6 h-6 text-emerald-400" />,
      title: "STABLE INTERNET CONNECTION",
      desc: "Real-time feeds require consistent bandwidth. VPNs may interfere.",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-cyan-500/30 bg-zinc-950 rounded-2xl overflow-hidden">
        <div className="p-8 text-center border-b border-zinc-800">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-12 h-12 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-widest text-white">PRE-FLIGHT CHECK</h1>
          <p className="text-cyan-400/70 mt-2 font-mono text-sm">OPHANIM-V2 ATLAS</p>
        </div>

        <div className="p-8 space-y-6">
          {checks.map((item, i) => (
            <div key={i} className="flex gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-cyan-500/50 transition-colors">
              <div className="mt-0.5">{item.icon}</div>
              <div>
                <div className="font-semibold text-white text-lg">{item.title}</div>
                <p className="text-zinc-400 text-sm mt-1 leading-snug">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 border-t border-zinc-800">
          <button
            onClick={() => {
              setAcknowledged(true);
              setTimeout(onAcknowledge, 400);
            }}
            disabled={acknowledged}
            className="w-full py-5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-bold text-lg tracking-widest rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70"
          >
            ACKNOWLEDGED — ENTER SYSTEM
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-center text-xs text-zinc-500 mt-6">
            By entering you confirm system requirements are met.
          </p>
        </div>
      </div>
    </div>
  );
}
