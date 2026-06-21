import React, { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import HeroName from "@/components/HeroName";
import HeroCardOpener from "@/components/HeroCardOpener";
import { getStaffVisuals, groupOnlineHeroes, EMPTY_ONLINE_HEROES } from "@/lib/staff-roles";
import api from "@/lib/api";
import HomePanel from "./HomePanel";

const POLL_FALLBACK_MS = 10000;

export default function HomeOnlineHeroes() {
  const { t } = useI18n();
  const { presence, status: nexusStatus } = useNexusSocket() || {};
  const [polled, setPolled] = useState(EMPTY_ONLINE_HEROES);

  const socketLive = nexusStatus === "online" || nexusStatus === "connecting";

  useEffect(() => {
    const applyOnlineHeroes = (payload) => {
      if (payload?.online_heroes) setPolled(payload.online_heroes);
    };
    const onPresence = (e) => applyOnlineHeroes(e.detail);

    const load = () => {
      api.get("/stats/public")
        .then((r) => applyOnlineHeroes(r.data))
        .catch(() => {});
    };

    load();
    const id = setInterval(load, POLL_FALLBACK_MS);
    window.addEventListener("nexoria:presence-updated", onPresence);
    return () => {
      clearInterval(id);
      window.removeEventListener("nexoria:presence-updated", onPresence);
    };
  }, []);

  const online = socketLive && presence?.online_heroes
    ? presence.online_heroes
    : polled;

  const { total, groups } = useMemo(
    () => groupOnlineHeroes(online.members || [], t),
    [online.members, t],
  );

  return (
    <div className="feed-col-widget" data-testid="home-online-heroes">
      <HomePanel
        label="Héros connectés au Royaume"
        color="var(--home-cyan)"
        icon={Users}
        count={total}
        variant="cyan"
      >
        {total === 0 ? (
          <div className="feed-empty feed-empty--compact">
            Aucun héros dans le Nexus Online pour le moment.
          </div>
        ) : (
          <div className="feed-staff-groups">
            {groups.map((group) => (
              <div key={group.id} data-testid={`home-online-group-${group.id}`}>
                <div className="feed-staff-grade-label" style={{ color: group.color }}>
                  <span className="feed-staff-grade-dot" style={{ background: group.color, boxShadow: `0 0 6px ${group.glow}` }} />
                  {group.label} ({group.count})
                </div>
                <div className="feed-staff-grade-list">
                  {group.members.map((p) => {
                    const staff = getStaffVisuals(p);
                    const accent = staff?.color || group.color;
                    return (
                      <HeroCardOpener
                        key={p.user_id}
                        userId={p.user_id}
                        username={p.username}
                        className="feed-staff-row"
                      >
                        <div
                          className="feed-staff-avatar"
                          style={{ background: `${accent}33`, color: accent }}
                        >
                          {p.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="feed-staff-info">
                          <div className="feed-staff-name">
                            <HeroName user={p} size="sm" showIcon nameColor={staff?.color || null} />
                          </div>
                          <div className="feed-staff-sub">
                            {p.class_name || "Héros"}
                            {p.level ? ` · Niv.${p.level}` : ""}
                            {p.room ? ` · ${p.room}` : ""}
                          </div>
                        </div>
                        <span className="feed-staff-dot" style={{ background: accent, boxShadow: `0 0 6px ${group.glow}` }} />
                      </HeroCardOpener>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </HomePanel>
    </div>
  );
}
