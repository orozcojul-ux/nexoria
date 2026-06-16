import React, { useState } from "react";
import {
  Cloud, Eye, EyeOff, RefreshCw, Skull, Sparkles, Swords, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { RARITY_HEX } from "@/lib/NexusIsoScene";
import GmBtn from "./GmBtn";
import { WEATHER_LABEL } from "./constants";

function GmSection({ tone, icon: Icon, title, children }) {
  return (
    <div className={`nexus-gm-section nexus-gm-section--${tone}`}>
      <div className="nexus-gm-section-head">
        {Icon && <Icon className="w-3.5 h-3.5 opacity-80" />}
        <span className="nexus-gm-section-title">{title}</span>
      </div>
      <div className="nexus-gm-section-body">{children}</div>
    </div>
  );
}

export default function GmWorldControls({
  weather, room, gm, requestTilePickFor, spawnForm, setSpawnForm,
  gmInvisible, toggleInvisible, godmode, toggleGodmode,
}) {
  const [bossName, setBossName] = useState("Archonte du Néant");
  const [bossHp, setBossHp] = useState("10000");

  return (
    <div className="space-y-4">
      <GmSection tone="cyan" icon={Cloud} title={`Météo — ${room?.name || "salle actuelle"}`}>
        <div className="nexus-gm-weather-grid">
          {Object.keys(WEATHER_LABEL).map((w) => {
            const Ico = WEATHER_LABEL[w].icon;
            return (
              <button
                key={w}
                type="button"
                onClick={() => { gm.weather(w); toast.success(`Météo : ${WEATHER_LABEL[w].fr}`); }}
                data-testid={`gm-weather-${w}`}
                className={`nexus-gm-weather-btn ${weather === w ? "nexus-gm-weather-btn--active" : ""}`}
              >
                <Ico className="w-3.5 h-3.5" />
                {WEATHER_LABEL[w].fr}
              </button>
            );
          })}
        </div>
      </GmSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <GmSection tone="violet" icon={Sparkles} title="Invoquer relique">
          <input
            value={spawnForm.name}
            onChange={(e) => setSpawnForm((s) => ({ ...s, name: e.target.value }))}
            placeholder="Nom de la relique"
            maxLength={60}
            className="nexus-gm-input mb-2"
            data-testid="gm-spawn-name"
          />
          <div className="grid grid-cols-2 gap-1 mb-2">
            <select
              value={spawnForm.rarity}
              onChange={(e) => setSpawnForm((s) => ({ ...s, rarity: e.target.value }))}
              className="nexus-gm-select"
              data-testid="gm-spawn-rarity"
            >
              {Object.keys(RARITY_HEX).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input
              value={spawnForm.icon}
              onChange={(e) => setSpawnForm((s) => ({ ...s, icon: e.target.value }))}
              placeholder="✨"
              maxLength={2}
              className="nexus-gm-input text-center"
              data-testid="gm-spawn-icon"
            />
          </div>
          <button
            type="button"
            onClick={() => requestTilePickFor("spawn")}
            data-testid="gm-spawn-place"
            className="nexus-gm-btn nexus-gm-btn--violet w-full"
          >
            Placer sur une case
          </button>
        </GmSection>

        <GmSection tone="violet" icon={Eye} title="Pouvoirs Gardien">
          <button
            type="button"
            onClick={toggleInvisible}
            data-testid="gm-invisible-toggle"
            className={`nexus-gm-btn w-full mb-2 ${gmInvisible ? "nexus-gm-btn--active" : ""}`}
          >
            {gmInvisible ? <><EyeOff className="w-3 h-3" /> Désactiver invisibilité</> : <><Eye className="w-3 h-3" /> Devenir invisible</>}
          </button>
          <button
            type="button"
            onClick={toggleGodmode}
            data-testid="gm-godmode-toggle"
            className={`nexus-gm-btn nexus-gm-btn--gold w-full ${godmode ? "nexus-gm-btn--active" : ""}`}
          >
            {godmode ? "⚡ Mode dieu actif" : "⚡ Activer mode dieu"}
          </button>
        </GmSection>

        <GmSection tone="danger" icon={Skull} title="Boss mondial">
          <input
            value={bossName}
            onChange={(e) => setBossName(e.target.value)}
            placeholder="Nom du boss"
            className="nexus-gm-input mb-2"
            data-testid="gm-boss-name"
          />
          <input
            value={bossHp}
            onChange={(e) => setBossHp(e.target.value)}
            type="number"
            placeholder="Points de vie"
            className="nexus-gm-input mb-2 font-mono"
            data-testid="gm-boss-hp"
          />
          <button
            type="button"
            onClick={() => {
              gm.worldBoss(bossName.trim() || "Archonte", parseInt(bossHp, 10) || 10000);
              toast.success("Boss invoqué dans la salle");
            }}
            data-testid="gm-boss-spawn"
            className="nexus-gm-btn nexus-gm-btn--danger w-full"
          >
            Invoquer le Boss
          </button>
        </GmSection>

        <GmSection tone="violet" icon={Zap} title="Événements monde">
          <button
            type="button"
            onClick={() => { gm.rift(); toast.success("Faille ouverte"); }}
            data-testid="gm-rift-open"
            className="nexus-gm-btn nexus-gm-btn--violet w-full mb-2"
          >
            Ouvrir une faille
          </button>
          <button
            type="button"
            onClick={() => { gm.invasion(6); toast.success("Invasion lancée"); }}
            data-testid="gm-invasion"
            className="nexus-gm-btn nexus-gm-btn--orange w-full mb-2"
          >
            <Swords className="w-3 h-3" /> Lancer invasion (6)
          </button>
          <button
            type="button"
            onClick={() => { gm.resetRoom(room?.id); toast.success("Zone réinitialisée"); }}
            data-testid="gm-reset-room"
            className="nexus-gm-btn w-full"
          >
            <RefreshCw className="w-3 h-3" /> Réinitialiser la zone
          </button>
        </GmSection>
      </div>
    </div>
  );
}
