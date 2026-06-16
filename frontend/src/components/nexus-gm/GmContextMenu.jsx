import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Ban, Eye, Footprints, Map, MessageCircle, Search, Shield, Snowflake, VolumeX, X,
} from "lucide-react";
import { toast } from "sonner";

export default function GmContextMenu({
  menu, onClose, gmApi, openHeroCard, openGmPanel, startWhisper,
  requestTeleport, teleportToHere, openBan, inspectPlayer,
}) {
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (!menu) return undefined;
    openedAtRef.current = Date.now();

    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const dismissOutside = (e) => {
      if (Date.now() - openedAtRef.current < 200) return;
      if (!e.target.closest("[data-admin-menu]")) onClose();
    };

    window.addEventListener("keydown", onKey);
    const armTimer = setTimeout(() => {
      window.addEventListener("pointerdown", dismissOutside, true);
    }, 120);

    return () => {
      clearTimeout(armTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", dismissOutside, true);
    };
  }, [menu, onClose]);

  if (!menu) return null;
  const p = menu.target;

  const actions = [
    { id: "card", label: "Carte Héros", icon: Eye, color: "#67e8f9", run: () => openHeroCard(p.user_id) },
    { id: "panel", label: "Panel Gardien", icon: Shield, color: "#e8c97a", run: () => openGmPanel(p) },
    { id: "whisper", label: "Chuchoter", icon: MessageCircle, color: "#f472b6", run: () => startWhisper(p) },
    { id: "follow", label: "Suivre", icon: Footprints, color: "#34d399", run: () => {
      gmApi.tpToPlayer?.(p.user_id);
      toast.success(`Suivi de ${p.username}`);
    }},
    { id: "gear", label: "Équipement", icon: Search, color: "#c4b5fd", run: () => inspectPlayer(p) },
    { id: "tp_here", label: "Téléporter ici", icon: Map, color: "#22d3ee", run: () => teleportToHere(p) },
    { id: "mute", label: p.muted ? "Démuter" : "Mute", icon: VolumeX, color: "#fbbf24", run: () => {
      gmApi.mute?.(p.user_id, !p.muted);
      toast.success(p.muted ? `${p.username} démuté` : `${p.username} muté`);
    }},
    { id: "freeze", label: p.frozen ? "Dégeler" : "Geler", icon: Snowflake, color: "#67e8f9", run: () => {
      gmApi.freeze?.(p.user_id, !p.frozen);
      toast.success(p.frozen ? `${p.username} libéré` : `${p.username} gelé`);
    }},
    { id: "ban", label: "Sanctions", icon: Ban, color: "#f87171", run: () => openBan(p) },
  ];

  return (
    <motion.div
      data-admin-menu
      data-testid="admin-context-menu"
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.12 }}
      style={{ position: "absolute", left: menu.x, top: menu.y }}
      className="nexus-gm-context"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="nexus-gm-context-head">
        <div className="flex items-center gap-2 min-w-0">
          <div className="nexus-hero-avatar" style={{ width: "1.75rem", height: "1.75rem" }}>
            {p.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <div className="nexus-gm-context-name">{p.username}</div>
            <div className="nexus-gm-context-sub">{p.class_name} · Niv {p.level}</div>
          </div>
        </div>
        <button type="button" onClick={onClose} data-testid="admin-menu-close" className="nexus-icon-btn" style={{ width: "1.5rem", height: "1.5rem" }}>
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="py-1">
        {actions.map((a) => {
          const Ico = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => { a.run(); onClose(); }}
              data-testid={`admin-action-${a.id}`}
              className="nexus-gm-context-action"
            >
              <Ico className="w-3.5 h-3.5 shrink-0" style={{ color: a.color }} />
              {a.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
