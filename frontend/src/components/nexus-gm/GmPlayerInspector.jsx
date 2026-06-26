import React from "react";
import { motion } from "framer-motion";
import {
  Ban, BarChart3, Briefcase, History, Package, Search, X,
} from "lucide-react";
import { getTitleLabel } from "@/lib/title-labels";
import HeroName from "@/components/HeroName";

const TABS = [
  { id: "stats", icon: BarChart3, label: "Stats" },
  { id: "inventory", icon: Package, label: "Inventaire" },
  { id: "history", icon: History, label: "Chronique" },
  { id: "sanctions", icon: Ban, label: "Sanctions" },
  { id: "purchases", icon: Briefcase, label: "Achats" },
];

function Stat({ label, v }) {
  return (
    <div className="nexus-gm-stat">
      <div className="nexus-gm-stat-label">{label}</div>
      <div className="nexus-gm-stat-value">{v ?? "—"}</div>
    </div>
  );
}

export default function GmPlayerInspector({ data, onClose, tab, setTab }) {
  if (!data) return null;
  const u = data.user || {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="nexus-gm-backdrop"
      style={{ zIndex: 95 }}
      onClick={onClose}
      data-testid="gm-inspect-modal"
    >
      <motion.div
        initial={{ scale: 0.94 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="nexus-gm-inspect-shell"
      >
        <header className="nexus-gm-head">
          <div className="nexus-gm-brand">
            <div className="nexus-gm-brand-mark">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="nexus-gm-title inline-flex items-center gap-2 flex-wrap">
                Inspection — <HeroName user={u} size="sm" showIcon={false} />
              </h3>
              <p className="nexus-gm-sub">{u.class_name} · niv. {u.level} · {u.rank}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="nexus-icon-btn">
            <X className="w-4 h-4" />
          </button>
        </header>

        <nav className="nexus-gm-tabs">
          {TABS.map((t) => {
            const Ico = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`nexus-gm-tab ${tab === t.id ? "nexus-gm-tab--active" : ""}`}
              >
                <Ico className="w-3 h-3" /> {t.label}
              </button>
            );
          })}
        </nav>

        <div className="nexus-gm-body text-xs">
          {tab === "stats" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Niveau" v={u.level} />
              <Stat label="XP" v={u.xp} />
              <Stat label="Écus" v={u.aether} />
              <Stat label="Réputation" v={u.reputation} />
              <Stat label="Rang" v={u.rank} />
              <Stat label="Rôle" v={u.role} />
              <Stat label="Classe" v={u.class_name} />
              <Stat label="Classe sec." v={u.secondary_class_id} />
              <Stat label="Titre actif" v={getTitleLabel(u)} />
              <Stat label="Followers" v={u.followers || 0} />
              <Stat label="Following" v={u.following || 0} />
              <Stat label="Inscrit le" v={u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "?"} />
            </div>
          )}
          {tab === "inventory" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.inventory?.length === 0 && <div className="text-zinc-500 italic col-span-full">Inventaire vide.</div>}
              {data.inventory?.map((it, i) => (
                <div key={i} className="nexus-room-card">
                  <div className="text-xl mb-1">{it.icon || "✨"}</div>
                  <div className="font-semibold text-cyan-200 text-xs truncate">{it.name}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{it.rarity}</div>
                </div>
              ))}
            </div>
          )}
          {tab === "history" && (
            <div className="space-y-1">
              {data.history?.length === 0 && <div className="nexus-gm-empty">Chronique vide.</div>}
              {data.history?.map((h, i) => (
                <div key={i} className="nexus-gm-log-row border-l-2 border-cyan-500/40">
                  <div className="text-zinc-200">{h.text}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1">
                    {h.created_at ? new Date(h.created_at).toLocaleString("fr-FR") : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "sanctions" && (
            <div className="space-y-2">
              {data.sanctions?.length === 0 && <div className="nexus-gm-empty">Aucune sanction.</div>}
              {data.sanctions?.map((s, i) => (
                <div key={i} className="nexus-gm-section nexus-gm-section--danger">
                  <div className="nexus-gm-section-body">
                    <div className="text-red-200 font-bold">Banni par {s.banned_by_username || "?"}</div>
                    <div className="text-zinc-300 mt-1">{s.reason}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">{s.duration_hours}h · jusqu&apos;au {s.until}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "purchases" && (
            <div className="space-y-2">
              {data.purchases?.length === 0 && <div className="nexus-gm-empty">Aucun achat.</div>}
              {data.purchases?.map((p, i) => (
                <div key={i} className="nexus-gm-target-card">
                  <div>
                    <div className="text-amber-200 font-bold">{p.name || p.sku}</div>
                    <div className="text-[10px] text-zinc-500">{p.purchased_at ? new Date(p.purchased_at).toLocaleString("fr-FR") : ""}</div>
                  </div>
                  <div className="text-amber-300 font-mono">{p.price} ⟡</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
