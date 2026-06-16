import React from "react";
import { Skull, Sparkles, Swords } from "lucide-react";

export default function NexusEventRibbon({ room }) {
  if (!room) return null;
  const hasBoss = !!room.world_boss;
  const hasRift = !!room.active_rift;
  if (!hasBoss && !hasRift) return null;

  return (
    <div className="nexus-event-ribbon" data-testid="nexus-event-ribbon">
      {hasBoss && (
        <div className="nexus-event-card nexus-event-card--boss">
          <Skull className="w-4 h-4" />
          <div>
            <div className="nexus-event-label">Boss mondial</div>
            <div className="nexus-event-value">{room.world_boss.name || "Menace active"}</div>
          </div>
          <Swords className="w-3.5 h-3.5 opacity-60" />
        </div>
      )}
      {hasRift && (
        <div className="nexus-event-card nexus-event-card--rift">
          <Sparkles className="w-4 h-4" />
          <div>
            <div className="nexus-event-label">Faille dimensionnelle</div>
            <div className="nexus-event-value">Énergie instable détectée</div>
          </div>
        </div>
      )}
    </div>
  );
}
