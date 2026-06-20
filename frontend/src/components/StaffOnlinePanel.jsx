import React from "react";
import { Shield } from "lucide-react";
import { PremiumCard } from "@/components/ui-premium";
import HeroCardOpener from "@/components/HeroCardOpener";
import { useI18n } from "@/contexts/I18nContext";
import { groupStaffByGrade, EMPTY_STAFF_ONLINE } from "@/lib/staff-roles";

function GradeRow({ grade, members, compact }) {
  return (
    <div className="staff-grade-row" data-testid={`staff-grade-${grade.id}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold"
          style={{ color: grade.color }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: grade.color, boxShadow: `0 0 8px ${grade.glow}` }}
          />
          {grade.label}
        </span>
        <span className="font-mono-stat text-xs font-bold" style={{ color: grade.color }}>
          {members.length}
        </span>
      </div>
      {members.length === 0 ? (
        <p className="text-[10px] text-zinc-600 italic pl-3.5">—</p>
      ) : (
        <ul className={`space-y-0.5 pl-3.5 ${compact ? "max-h-16 overflow-y-auto" : ""}`}>
          {members.map((m) => (
            <li key={m.user_id} className="truncate">
              <HeroCardOpener
                userId={m.user_id}
                username={m.username}
                className="text-xs text-zinc-300 hover:text-white transition-colors"
                title={m.rank ? `${m.username} · ${m.rank}` : m.username}
                data-testid={`staff-online-${m.username}`}
              >
                {m.username}
              </HeroCardOpener>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Staff en ligne — différencié par grade (Sage / Modérateur).
 */
export default function StaffOnlinePanel({
  staffOnline,
  closed = false,
  compact = false,
  className = "",
  testid = "staff-online-panel",
}) {
  const { t } = useI18n();
  const data = staffOnline || EMPTY_STAFF_ONLINE;
  const grades = groupStaffByGrade(data.members, t);

  return (
    <PremiumCard
      tone="cyan"
      hover={false}
      className={`h-full ${className}`}
      testid={testid}
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.32em] text-zinc-500 font-bold">{t("panel.online_staff")}</p>
          <p className="font-mono-stat font-black text-xl text-white leading-none mt-0.5">
            {closed ? "—" : data.total}
          </p>
        </div>
      </div>

      {closed ? (
        <p className="text-[10px] text-zinc-500 italic">{t("staff.status.nexus_closed")}</p>
      ) : (
        <div className="space-y-2.5 border-t border-white/5 pt-2.5">
          {grades.map((g) => (
            <GradeRow key={g.id} grade={g} members={g.members} compact={compact} />
          ))}
          {data.total === 0 && (
            <p className="text-[10px] text-zinc-500 italic text-center py-1">{t("panel.no_staff")}</p>
          )}
        </div>
      )}
    </PremiumCard>
  );
}
