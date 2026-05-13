import React, { useState } from "react";
import { motion } from "motion/react";
import { Activity, Database, Globe2, Shield, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: existing } = await supabase
        .from("operators")
        .select("email")
        .eq("email", email)
        .single();

      if (!existing) {
        const { error: insertError } = await supabase
          .from("operators")
          .insert([{ name, email }]);

        if (insertError) {
          setError(insertError.message);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Database unavailable");
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="auth-layout">
        <section className="auth-copy">
          <div className="brand-row compact">
            <div className="brand-mark"><Shield className="w-5 h-5" /></div>
            <div>
              <div className="brand-title">OPHANIM V1</div>
              <div className="brand-subtitle">Global OSINT command surface</div>
            </div>
          </div>
          <h1>Professional operating picture for live global signals.</h1>
          <p>Fuse aviation, maritime, seismic, civil unrest, OSM infrastructure, and imagery layers in one map.</p>
          <div className="auth-feature-grid">
            <Feature icon={<Globe2 className="w-4 h-4" />} title="Worldwide map" desc="Global and regional views." />
            <Feature icon={<Activity className="w-4 h-4" />} title="Live streams" desc="Aviation, AIS, GDELT, USGS." />
            <Feature icon={<Database className="w-4 h-4" />} title="History" desc="Saved events and replay." />
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card__header">
            <UserPlus className="w-5 h-5" />
            <div>
              <strong>Operator access</strong>
              <span>Enter name and email to open demo.</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
            </label>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@example.com" />
            </label>

            {error && (
              <div className="auth-error">
                <span>{error}</span>
                <button type="button" onClick={onSuccess}>Continue demo</button>
              </div>
            )}

            <button disabled={loading} className="auth-submit">
              {loading ? "Opening..." : "Try demo"}
            </button>
          </form>
        </section>
      </motion.div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="auth-feature">
      {icon}
      <strong>{title}</strong>
      <span>{desc}</span>
    </div>
  );
}

