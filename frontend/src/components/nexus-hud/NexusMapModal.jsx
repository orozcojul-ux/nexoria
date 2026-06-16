import React from "react";
import { motion } from "framer-motion";
import { Map, X, Lock } from "lucide-react";
import { MAP_GROUP_LABELS, MAP_GROUP_ORDER } from "./nexus-constants";

export default function NexusMapModal({ open, onClose, rooms, currentRoom, onTravel }) {
  if (!open) return null;

  const byGroup = {};
  (rooms || []).forEach((r) => {
    const g = r.group || "misc";
    (byGroup[g] = byGroup[g] || []).push(r);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="nexus-map-backdrop"
      onClick={onClose}
      data-testid="nexus-map"
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="nexus-map-shell"
      >
        <div className="nexus-map-head">
          <div className="flex items-center gap-3">
            <div className="nexus-brand-mark">
              <Map className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h2 className="nexus-brand-title text-base">Carte dimensionnelle</h2>
              <p className="nexus-brand-sub">{rooms?.length || 0} sanctuaires connectés</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="nexus-icon-btn" data-testid="nexus-map-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="nexus-map-grid overflow-y-auto p-4">
          {MAP_GROUP_ORDER.filter((g) => byGroup[g]?.length).map((g) => {
            const lbl = MAP_GROUP_LABELS[g] || { fr: g };
            return (
              <div key={g} className="mb-6">
                <h3 className="nexus-map-group-title">{lbl.fr}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {byGroup[g].map((r) => {
                    const isCurrent = currentRoom === r.id;
                    const locked = r.restricted_for_user;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={locked || isCurrent}
                        onClick={() => onTravel(r.id)}
                        data-testid={`map-room-${r.id}`}
                        className={`nexus-room-card ${isCurrent ? "nexus-room-card--here" : ""}`}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-2xl">{r.icon || "🌀"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-white truncate">{r.name}</div>
                            <div className="text-[10px] text-zinc-500">{r.online || 0}/{r.max_players} héros</div>
                          </div>
                          {locked && <Lock className="w-4 h-4 text-amber-300 shrink-0" />}
                          {isCurrent && <span className="text-[9px] uppercase tracking-widest text-cyan-300 font-bold">Ici</span>}
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2">{r.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
