import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { motion } from "framer-motion";
import {
  Megaphone, MapPin, Snowflake, VolumeX, Ban, Eye, Wrench, Clock,
  Users, Zap, ScrollText, TrendingUp,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { PremiumCard } from "@/components/ui-premium";
import HeroName from "@/components/HeroName";
import HeroCardOpener from "@/components/HeroCardOpener";
import { groupStaffByGrade, EMPTY_STAFF_ONLINE } from "@/lib/staff-roles";

const CLASS_COLORS = {
  mage: "#9D4CDD", warrior: "#EF4444", assassin: "#71717A", paladin: "#EAB308",
  alchemist: "#10B981", explorer: "#00BFFF", necromancer: "#7928CA", architect: "#A855F7",
  chronomancer: "#00E5FF", inventor: "#FFD700",
};

const CLASS_LABEL = {
  mage: "Mage", warrior: "Guerrier", assassin: "Assassin", paladin: "Paladin",
  alchemist: "Alchimiste", explorer: "Explorateur", necromancer: "Nécromancien",
  architect: "Architecte", chronomancer: "Chronomancien", inventor: "Inventeur",
};

const ACTIVITY_COLORS = {
  event: "text-purple-300", alert: "text-red-300", connection: "text-green-300",
  quest: "text-cyan-300", default: "text-zinc-400",
};

function CmsPanel({ title, icon: Icon, children, className = "", testid, action }) {
  return (
    <PremiumCard tone="violet" hover={false} className={`h-full ${className}`} testid={testid}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.35em] text-violet-300 font-bold flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {title}
        </div>
        {action}
      </div>
      {children}
    </PremiumCard>
  );
}

export function ActivityFeed() {
  const { t, fmtDate } = useI18n();
  const [items, setItems] = useState([]);
  const { gmLogs = [] } = useNexusSocket() || {};

  useEffect(() => {
    api.get("/feed").then((r) => {
      const posts = (r.data || []).slice(0, 4).map((p) => ({
        id: p.post_id,
        tag: t("dashboard.tag.connection"),
        tagKey: "connection",
        text: t("dashboard.posted", { name: p.author?.username || t("common.hero") }),
        author: p.author,
        time: fmtDate(p.created_at, { hour: "2-digit", minute: "2-digit" }),
      }));
      setItems(posts);
    }).catch(() => {});
  }, [t, fmtDate]);

  const merged = useMemo(() => {
    const logs = (gmLogs || []).slice(0, 6).map((l, i) => ({
      id: `gm-${i}`,
      tag: t("dashboard.tag.alert"),
      tagKey: "alert",
      text: l.message || l.action || t("dashboard.gm_action"),
      time: l.created_at ? fmtDate(l.created_at, { hour: "2-digit", minute: "2-digit" }) : "—",
    }));
    return [...logs, ...items].slice(0, 8);
  }, [gmLogs, items, t, fmtDate]);

  return (
    <CmsPanel title={t("dashboard.activity")} icon={Zap} testid="activity-feed">
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {merged.length === 0 && <div className="text-zinc-500 text-sm italic py-4 text-center">{t("dashboard.no_activity")}</div>}
        {merged.map((it) => (
          <div key={it.id} className="flex gap-2 text-xs py-1.5 border-b border-white/5 last:border-0">
            <span className={`shrink-0 font-bold uppercase tracking-wider text-[9px] ${ACTIVITY_COLORS[it.tagKey] || ACTIVITY_COLORS.default}`}>
              [{it.tag}]
            </span>
            <span className="text-zinc-300 flex-1 leading-snug">{it.text}</span>
            <span className="text-zinc-600 font-mono-stat shrink-0">{it.time}</span>
          </div>
        ))}
      </div>
    </CmsPanel>
  );
}

export function QuickActions() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  if (!isStaff) return null;

  const actions = [
    { labelKey: "dashboard.action.broadcast", icon: Megaphone, color: "#A855F7", to: "/admin", tab: "broadcast" },
    { labelKey: "dashboard.action.warp", icon: MapPin, color: "#00E5FF", to: "/nexus" },
    { labelKey: "dashboard.action.freeze", icon: Snowflake, color: "#3B82F6", to: "/nexus" },
    { labelKey: "dashboard.action.mute", icon: VolumeX, color: "#F59E0B", to: "/nexus" },
    { labelKey: "dashboard.action.ban", icon: Ban, color: "#EF4444", to: "/admin", tab: "bans" },
    { labelKey: "dashboard.action.observe", icon: Eye, color: "#10B981", to: "/nexus" },
    { labelKey: "dashboard.action.maintenance", icon: Wrench, color: "#71717A", to: "/admin", tab: "system" },
    { labelKey: "dashboard.action.gm_logs", icon: ScrollText, color: "#EC4899", to: "/admin" },
  ];

  return (
    <CmsPanel title={t("dashboard.quick_actions")} icon={Zap} testid="quick-actions">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button
            key={a.labelKey}
            onClick={() => navigate(a.to)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-left transition-all group"
            data-testid={`quick-action-${a.labelKey.split(".").pop()}`}
          >
            <a.icon className="w-4 h-4 shrink-0" style={{ color: a.color }} />
            <span className="text-xs font-display text-zinc-300 group-hover:text-white">{t(a.labelKey)}</span>
          </button>
        ))}
      </div>
    </CmsPanel>
  );
}

export function OnlinePlayersPanel() {
  const { t } = useI18n();
  const { presence } = useNexusSocket() || {};
  const staffOnline = presence?.staff_online ?? EMPTY_STAFF_ONLINE;
  const grades = groupStaffByGrade(staffOnline.members, t);
  const total = staffOnline.total ?? 0;

  return (
    <CmsPanel title={`${t("panel.online_staff")} (${total})`} icon={Users} testid="online-players">
      <div className="space-y-3 max-h-56 overflow-y-auto">
        {total === 0 && (
          <div className="text-zinc-500 text-sm italic py-4 text-center">
            {t("panel.no_staff")}
          </div>
        )}
        {grades.map((grade) => {
          if (grade.members.length === 0) return null;
          return (
            <div key={grade.id} data-testid={`feed-staff-grade-${grade.id}`}>
              <div
                className="text-[10px] uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1.5"
                style={{ color: grade.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: grade.color }} />
                {grade.label} ({grade.members.length})
              </div>
              <div className="space-y-1 pl-3">
                {grade.members.map((p) => (
                  <HeroCardOpener
                    key={p.user_id}
                    userId={p.user_id}
                    username={p.username}
                    className="flex items-center gap-2 py-1 hover:bg-white/[0.03] rounded-lg px-1 transition-all w-full text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: `${grade.color}33`, color: grade.color }}
                    >
                      {p.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate"><HeroName user={p} size="sm" showIcon={false} /></div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        {grade.label}{p.rank ? ` · ${p.rank}` : ""}{p.room ? ` · ${p.room}` : ""}
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: grade.color, boxShadow: `0 0 6px ${grade.glow}` }} />
                  </HeroCardOpener>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </CmsPanel>
  );
}

export function ClassDistribution() {
  const { t } = useI18n();
  const [data, setData] = useState([]);

  const classLabel = (id) => {
    const key = `class.${id}`;
    const translated = t(key);
    return translated !== key ? translated : (CLASS_LABEL[id] || id);
  };

  useEffect(() => {
    api.get("/world/heroes").then((r) => {
      const counts = {};
      (r.data || []).forEach((h) => {
        const c = h.class_id || "unknown";
        counts[c] = (counts[c] || 0) + 1;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      setData(
        Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([id, n]) => ({
            name: classLabel(id),
            value: Math.round((n / total) * 100),
            count: n,
            color: CLASS_COLORS[id] || "#9CA3AF",
          }))
      );
    }).catch(() => {});
  }, [t]);

  return (
    <CmsPanel title={t("dashboard.class_distribution")} icon={Users} testid="class-distribution">
      {data.length === 0 ? (
        <div className="text-zinc-500 text-sm italic py-8 text-center">{t("common.loading")}</div>
      ) : (
        <div className="flex gap-4 items-center">
          <div className="w-32 h-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={28} outerRadius={48} paddingAngle={2}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} stroke="transparent" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5 text-xs">
            {data.slice(0, 6).map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-zinc-300 flex-1">{d.name}</span>
                <span className="font-mono-stat text-violet-300">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CmsPanel>
  );
}

export function ActivityChart({ visits = 0, heroesOnline = 0 }) {
  const chartData = useMemo(() => {
    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const base = Math.max(heroesOnline, 10);
    return days.map((d, i) => ({
      day: d,
      joueurs: Math.round(base * (0.6 + Math.sin(i * 0.9) * 0.25 + i * 0.05)),
      visites: Math.round((visits / 7) * (0.8 + i * 0.04)),
    }));
  }, [visits, heroesOnline]);

  return (
    <CmsPanel title="Activité — 7 derniers jours" icon={TrendingUp} testid="activity-chart" className="lg:col-span-2">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="day" tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{ background: "#0F0820", border: "1px solid rgba(138,43,226,0.3)", borderRadius: 8, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="joueurs" stroke="#8A2BE2" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="visites" stroke="#00E5FF" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3 text-center">
        {[
          { l: "Pic joueurs", v: Math.max(...chartData.map((d) => d.joueurs)) },
          { l: "Connexions", v: visits || "—" },
          { l: "Temps moy.", v: "42m" },
          { l: "Pages vues", v: visits * 3 || "—" },
        ].map((s) => (
          <div key={s.l} className="rounded-lg bg-white/[0.03] border border-white/5 py-2">
            <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">{s.l}</div>
            <div className="font-mono-stat text-sm text-violet-200 mt-0.5">{s.v}</div>
          </div>
        ))}
      </div>
    </CmsPanel>
  );
}

export function ActiveEventsPanel() {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    api.get("/widgets/events").then((r) => setEvents((r.data || []).slice(0, 4))).catch(() => {});
  }, []);

  return (
    <CmsPanel title="Événements actifs" icon={Clock} testid="active-events">
      <div className="space-y-2">
        {events.length === 0 && <div className="text-zinc-500 text-sm italic py-4">Aucun événement programmé</div>}
        {events.map((ev) => (
          <div key={ev.event_id || ev.title} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-lg">✨</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-display text-white truncate">{ev.title || ev.name}</div>
              <div className="text-[10px] text-zinc-500 truncate">{ev.description || "—"}</div>
            </div>
          </div>
        ))}
        <Link to="/events" className="block text-center text-[10px] uppercase tracking-widest text-violet-300 font-bold pt-2 hover:text-violet-200">
          Voir tout →
        </Link>
      </div>
    </CmsPanel>
  );
}

export function AdminNotes() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  if (!isStaff) return null;

  const notes = [
    "Vérifier les failles actives avant le boss.",
    "Sync Discord après maintenance.",
    "Badges orphelins : contrôler enrich_badges.",
  ];

  return (
    <CmsPanel title="Notes admin" icon={ScrollText} testid="admin-notes">
      <ul className="space-y-2 text-sm text-zinc-400">
        {notes.map((n, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex gap-2 py-1 border-b border-white/5 last:border-0">
            <span className="text-violet-400">•</span>
            <span>{n}</span>
          </motion.li>
        ))}
      </ul>
    </CmsPanel>
  );
}
