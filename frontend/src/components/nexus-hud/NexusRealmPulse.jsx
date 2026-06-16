import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";

export default function NexusRealmPulse({ presence, playersCount }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2400);
    return () => clearInterval(id);
  }, []);

  const load = Math.min(100, Math.round(((presence?.total || 0) / 50) * 100));
  const roomLoad = Math.min(100, Math.round((playersCount / 20) * 100));

  return (
    <div className="nexus-realm-pulse" data-testid="nexus-realm-pulse">
      <div className="nexus-realm-pulse-head">
        <Activity className="w-3 h-3 text-cyan-300" />
        <span>Pulsation du royaume</span>
      </div>
      <div className="nexus-realm-meter">
        <span className="nexus-realm-meter-label">Monde</span>
        <div className="nexus-realm-meter-track">
          <div className="nexus-realm-meter-fill nexus-realm-meter-fill--world" style={{ width: `${load}%` }} />
        </div>
        <span className="nexus-realm-meter-val">{presence?.total || 0}</span>
      </div>
      <div className="nexus-realm-meter">
        <span className="nexus-realm-meter-label">Zone</span>
        <div className="nexus-realm-meter-track">
          <div className="nexus-realm-meter-fill nexus-realm-meter-fill--zone" style={{ width: `${roomLoad}%` }} />
        </div>
        <span className="nexus-realm-meter-val">{playersCount}</span>
      </div>
      <div className={`nexus-realm-wave ${tick % 2 ? "nexus-realm-wave--alt" : ""}`} aria-hidden />
    </div>
  );
}
