import React from "react";
import { Users, Crown, VolumeX, Snowflake, EyeOff, MessageCircle } from "lucide-react";
import HeroName from "@/components/HeroName";
import HeroPixelAvatar from "@/components/HeroPixelAvatar";
import ClassImage from "@/components/ClassImage";

export default function NexusSocialDock({
  players,
  you,
  isStaff,
  friendIds = [],
  onSelectHero,
  onFriendMessage,
  onGmTarget,
}) {
  const visible = players.filter((p) => !p.invisible || isStaff);
  const friendSet = new Set(friendIds);

  return (
    <aside className="nexus-social-dock" data-testid="nexus-players">
      <div className="nexus-hud-panel flex flex-col flex-1 min-h-0">
        <div className="nexus-hud-panel-head">
          <Users className="w-3.5 h-3.5 text-cyan-300" />
          <span className="nexus-hud-panel-title">Héros présents</span>
          <span className="nexus-hud-panel-count">{visible.length}</span>
        </div>
        <div className="nexus-social-body" data-testid="nexus-player-list">
          {visible.length === 0 ? (
            <p className="text-[11px] text-zinc-500 text-center py-6 italic">Le sanctuaire est vide…</p>
          ) : (
            visible.map((p) => (
              <div key={p.sid} className="nexus-hero-row group">
                <button type="button" className="flex items-center gap-2 flex-1 min-w-0" onClick={() => onSelectHero(p.user_id)}>
                  <span className="nexus-hero-avatar nexus-hero-avatar--pixel">
                    <HeroPixelAvatar user={p} size={24} />
                  </span>
                  <div className="nexus-hero-meta">
                    <div className="nexus-hero-name">
                      <HeroName user={p} size="sm" />
                      {p.sid === you?.sid && <span className="text-[9px] text-cyan-400 ml-1">(vous)</span>}
                    </div>
                    <div className="nexus-hero-class" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {(p.class_id || p.class_name) && (
                        <ClassImage classId={p.class_id || p.class_name} size={16} alt={p.class_name || ""} />
                      )}
                      <span>{p.class_name} · niv. {p.level}{p.rank ? ` · ${p.rank}` : ""}</span>
                    </div>
                  </div>
                </button>
                <div className="nexus-hero-actions">
                  {p.muted && <VolumeX className="w-3 h-3 text-red-400" />}
                  {p.frozen && <Snowflake className="w-3 h-3 text-cyan-300" />}
                  {p.invisible && <EyeOff className="w-3 h-3 text-violet-300" />}
                  {p.user_id !== you?.user_id && (
                    <>
                      {friendSet.has(p.user_id) && (
                        <button type="button" className="nexus-hero-action" title="Écho privé" onClick={() => onFriendMessage?.(p)} data-testid={`friend-msg-${p.user_id}`}>
                          <MessageCircle className="w-3 h-3 text-cyan-300" />
                        </button>
                      )}
                    </>
                  )}
                  {isStaff && (
                    <button type="button" className="nexus-hero-action" title="Gardien" onClick={() => onGmTarget(p)} data-testid={`gm-target-${p.user_id}`}>
                      <Crown className="w-3 h-3 text-amber-300" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
