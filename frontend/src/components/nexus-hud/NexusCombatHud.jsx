import React from "react";
import { Swords, Skull, Sparkles } from "lucide-react";

export default function NexusCombatHud({
  combat,
  targetEnemy,
  onAttack,
  attackCooldown,
  dead,
  respawnIn,
  onRespawn,
  lastReward,
}) {
  if (!combat?.combatActive && !combat?.player) return null;

  const player = combat?.player;
  const hpPct = player?.maxHp ? Math.round((player.hp / player.maxHp) * 100) : 100;
  const targetHpPct = targetEnemy?.maxHp
    ? Math.round((targetEnemy.currentHp / targetEnemy.maxHp) * 100)
    : 0;

  return (
    <div className="nexus-combat-hud" data-testid="nexus-combat-hud">
      <div className="nexus-combat-hud-row">
        <span className="nexus-combat-hud-label">
          <Swords className="w-3.5 h-3.5" /> PV
        </span>
        <div className="nexus-combat-hp-track">
          <div
            className="nexus-combat-hp-fill nexus-combat-hp-fill--player"
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <span className="nexus-combat-hp-text">{player?.hp ?? 0}/{player?.maxHp ?? 0}</span>
      </div>

      {targetEnemy && (
        <div className="nexus-combat-hud-row">
          <span className="nexus-combat-hud-label">Cible</span>
          <span className="nexus-combat-target-name">{targetEnemy.name}</span>
          <div className="nexus-combat-hp-track nexus-combat-hp-track--sm">
            <div
              className="nexus-combat-hp-fill nexus-combat-hp-fill--enemy"
              style={{ width: `${targetHpPct}%` }}
            />
          </div>
        </div>
      )}

      {dead ? (
        <div className="nexus-combat-dead">
          <Skull className="w-4 h-4" />
          <span>Vous êtes tombé au combat</span>
          {respawnIn > 0 ? (
            <span className="nexus-combat-respawn-timer">{respawnIn}s</span>
          ) : (
            <button type="button" className="nexus-combat-respawn-btn" onClick={onRespawn}>
              Renaître
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="nexus-combat-attack-btn"
          disabled={!targetEnemy || attackCooldown}
          onClick={onAttack}
          data-testid="nexus-combat-attack-btn"
        >
          {attackCooldown ? "…" : "Attaquer (Espace)"}
        </button>
      )}

      {lastReward && (
        <div className="nexus-combat-reward" data-testid="nexus-combat-reward">
          <Sparkles className="w-3.5 h-3.5" />
          +{lastReward.xp} XP · +{lastReward.aether} Écus
          {lastReward.resource ? ` · ${lastReward.resource}` : ""}
        </div>
      )}
    </div>
  );
}
