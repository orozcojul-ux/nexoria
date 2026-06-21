import React from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import HeroName from "@/components/HeroName";
import HeroCardOpener from "@/components/HeroCardOpener";
import { groupStaffByGrade, EMPTY_STAFF_ONLINE } from "@/lib/staff-roles";
import HomePanel from "./HomePanel";

export default function HomeStaffOnline() {
  const { t } = useI18n();
  const { presence } = useNexusSocket() || {};
  const staffOnline = presence?.staff_online ?? EMPTY_STAFF_ONLINE;
  const grades = groupStaffByGrade(staffOnline.members, t);
  const total = staffOnline.total ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      data-testid="online-players"
    >
      <HomePanel
        label={t("panel.online_staff")}
        icon={Users}
        count={total}
      >
        {total === 0 ? (
          <div className="feed-empty feed-empty--compact">
            {t("panel.no_staff") || "Aucune Sentinelle en ligne"}
          </div>
        ) : (
          <div className="feed-staff-groups">
            {grades.map((grade) => {
              if (grade.members.length === 0) return null;
              return (
                <div key={grade.id} data-testid={`feed-staff-grade-${grade.id}`}>
                  <div className="feed-staff-grade-label" style={{ color: grade.color }}>
                    <span className="feed-staff-grade-dot" style={{ background: grade.color }} />
                    {grade.label} ({grade.members.length})
                  </div>
                  <div className="feed-staff-grade-list">
                    {grade.members.map((p) => (
                      <HeroCardOpener
                        key={p.user_id}
                        userId={p.user_id}
                        username={p.username}
                        className="feed-staff-row"
                      >
                        <div
                          className="feed-staff-avatar"
                          style={{ background: `${grade.color}33`, color: grade.color }}
                        >
                          {p.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="feed-staff-info">
                          <div className="feed-staff-name">
                            <HeroName user={p} size="sm" showIcon={false} />
                          </div>
                          <div className="feed-staff-sub">
                            {grade.label}
                            {p.rank ? ` · ${p.rank}` : ""}
                            {p.room ? ` · ${p.room}` : ""}
                          </div>
                        </div>
                        <span className="feed-staff-dot" style={{ background: grade.color, boxShadow: `0 0 6px ${grade.glow}` }} />
                      </HeroCardOpener>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </HomePanel>
    </motion.div>
  );
}
