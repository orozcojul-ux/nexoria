import React from "react";
import { Globe2, Map, Crown, X, Wifi, WifiOff, Users } from "lucide-react";
import { NexoriaLogoMark } from "@/components/maintenance/NexoriaLogoMark";

export default function NexusTopBar({
  status,
  presence,
  playersCount,
  mapOpen,
  friendsOpen,
  friendsBadge = 0,
  isStaff,
  onToggleMap,
  onToggleFriends,
  onOpenGm,
  onClose,
}) {
  const online = status === "online";

  return (
    <header className="nexus-topbar" data-testid="nexus-topbar">
      <div className="nexus-brand">
        <div className="nexus-brand-mark">
          <NexoriaLogoMark size={28} />
        </div>
        <div>
          <h1 className="nexus-brand-title">Nexus Online</h1>
          <p className="nexus-brand-sub">Royaume vivant</p>
        </div>
      </div>

      <div className="nexus-stat-chips">
        <span className={`nexus-chip ${online ? "nexus-chip--live" : ""}`}>
          {online ? <span className="nexus-chip-dot" /> : <WifiOff className="w-3 h-3" />}
          {online ? "Live" : status === "connecting" ? "Sync…" : "Hors ligne"}
        </span>
        <span className="nexus-chip nexus-chip--cyan" data-testid="presence-total">
          <Globe2 className="w-3 h-3" />
          <strong>{presence.total || 0}</strong> héros
        </span>
        <span className="nexus-chip" data-testid="presence-room">
          Salle <strong>{playersCount}</strong>
        </span>
        <span className="nexus-chip" data-testid="presence-rooms">
          <strong>{presence.active_rooms || 0}</strong> zones
        </span>
      </div>

      <div className="nexus-topbar-actions">
        <button
          type="button"
          onClick={onToggleMap}
          data-testid="nexus-map-toggle"
          className={`nexus-action-btn ${mapOpen ? "nexus-action-btn--active" : ""}`}
        >
          <Map className="w-3.5 h-3.5" /> Carte
        </button>
        <button
          type="button"
          onClick={onToggleFriends}
          data-testid="nexus-friends-toggle"
          className={`nexus-action-btn nexus-action-btn--friends ${friendsOpen ? "nexus-action-btn--active" : ""}`}
        >
          <Users className="w-3.5 h-3.5" /> Compagnons
          {friendsBadge > 0 && (
            <span className="nexus-friends-tab-badge" style={{ position: "static", marginLeft: "0.25rem" }}>
              {friendsBadge > 9 ? "9+" : friendsBadge}
            </span>
          )}
        </button>
        {isStaff && (
          <button
            type="button"
            onClick={onOpenGm}
            data-testid="gm-open-button"
            className="nexus-action-btn nexus-action-btn--staff"
          >
            <Crown className="w-3.5 h-3.5" /> Gardien
          </button>
        )}
        <button type="button" onClick={onClose} data-testid="nexus-close" className="nexus-icon-btn" aria-label="Fermer">
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
