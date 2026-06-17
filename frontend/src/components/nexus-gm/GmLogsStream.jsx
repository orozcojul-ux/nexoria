import React, { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import api from "@/lib/api";

const ACTION_LABEL = {
  announce: "Annonce", teleport: "TP", kick: "Kick", mute: "Mute", freeze: "Freeze",
  invisible: "Invisible", weather: "Météo", spawn_item: "Relique", ban: "Ban",
  world_boss: "Boss", rift: "Faille", observe: "Observe", invasion: "Invasion",
  reset_room: "Reset zone", godmode: "Mode dieu", give_aether: "Écus", give_item: "Objet",
  prison: "Prison",
};

export default function GmLogsStream({ liveLogs = [] }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = () => {
    setLoading(true);
    api.get("/admin/gm-audit", { params: { limit: 40 } })
      .then((r) => setHistory(r.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const merged = [];
  const seen = new Set();
  for (const entry of [...liveLogs, ...history]) {
    const id = entry.audit_id || `${entry.action}-${entry.created_at}`;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(entry);
    if (merged.length >= 50) break;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="nexus-gm-section-title flex items-center gap-1">
          <History className="w-3 h-3 text-cyan-300" /> Journal temps réel
        </div>
        <button type="button" onClick={loadHistory} disabled={loading} className="nexus-gm-btn text-[10px] py-1 px-2">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </button>
      </div>
      <div className="nexus-gm-log-list" data-testid="gm-logs-stream">
        {merged.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-xs italic">Aucune action GM enregistrée.</div>
        ) : (
          merged.map((entry) => (
            <div key={entry.audit_id || entry.created_at} className="nexus-gm-log-row">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-200">
                  {ACTION_LABEL[entry.action] || entry.action}
                </span>
                <span className="text-[9px] text-zinc-600 font-mono shrink-0">
                  {entry.created_at ? new Date(entry.created_at).toLocaleString("fr-FR") : ""}
                </span>
              </div>
              <div className="text-xs text-zinc-300 mt-0.5">
                <span className="text-cyan-300 font-semibold">{entry.actor_username}</span>
                {entry.target_username && (
                  <span className="text-zinc-500"> → <span className="text-violet-300">{entry.target_username}</span></span>
                )}
              </div>
              {entry.payload && Object.keys(entry.payload).length > 0 && (
                <div className="text-[10px] text-zinc-500 font-mono mt-1 truncate">
                  {JSON.stringify(entry.payload)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
