import React from "react";
import { MapPin, Sparkles } from "lucide-react";
import { WEATHER_LABEL } from "./nexus-constants";

export default function NexusRoomPulse({ room, weather, playersCount }) {
  if (!room) return null;
  const w = WEATHER_LABEL[weather] || WEATHER_LABEL.clear;
  const WeatherIcon = w.icon;

  return (
    <div className="nexus-pulse-bar" data-testid="nexus-room-pulse">
      <div className="nexus-pulse-room">
        <Sparkles className="w-3.5 h-3.5 text-violet-300" />
        <span className="nexus-pulse-room-name">{room.name}</span>
      </div>
      <span className="nexus-pulse-divider" />
      <span className="nexus-pulse-widget">
        <WeatherIcon className="w-3 h-3 text-cyan-300" />
        <strong>{w.fr}</strong>
      </span>
      <span className="nexus-pulse-widget">
        Héros ici <strong>{playersCount}</strong>
      </span>
      {room.portals?.length > 0 && (
        <span className="nexus-pulse-widget">
          <MapPin className="w-3 h-3 text-cyan-400" />
          <strong>{room.portals.length}</strong> portail{room.portals.length > 1 ? "s" : ""}
        </span>
      )}
      {room.world_boss && (
        <span className="nexus-pulse-widget" style={{ borderColor: "rgba(239,68,68,0.35)", color: "#fca5a5" }}>
          Boss actif
        </span>
      )}
      {room.active_rift && (
        <span className="nexus-pulse-widget" style={{ borderColor: "rgba(167,139,250,0.35)", color: "#c4b5fd" }}>
          Faille ouverte
        </span>
      )}
    </div>
  );
}
