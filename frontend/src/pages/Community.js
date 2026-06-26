import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users, Shield, Crown, Newspaper, Swords, Sparkles, ChevronRight,
  Globe, UserPlus, Flag, MapPin,
} from "lucide-react";
import api from "@/lib/api";
import { PageShell, PremiumCard } from "@/components/ui-premium";
import HeroName from "@/components/HeroName";
import { getUserAvatarUrl } from "@/lib/user-avatar";
import { getStaffVisuals, NEXUS_SUPREME } from "@/lib/staff-roles";
import { usePageBanner } from "@/lib/page-banners";
import { useI18n } from "@/contexts/I18nContext";
import "./community-team.css";

const DISCORD_URL = process.env.REACT_APP_DISCORD_URL || "https://discord.gg/RC5QjcWDCH";

function StatPill({ icon: Icon, value, label, color }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="p-2 rounded-lg" style={{ background: `${color}1a`, border: `1px solid ${color}40` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <div className="font-display font-black text-lg leading-none" style={{ color }}>{value ?? 0}</div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, accent, action }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="w-5 h-5" style={{ color: accent }} />}
      <h2 className="font-display font-black text-xl uppercase tracking-widest" style={{ color: accent }}>{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent ml-2" />
      {action}
    </div>
  );
}

function TeamCard({ member }) {
  const { t } = useI18n();
  const avatar = getUserAvatarUrl(member);
  const visuals = member.is_nexus_supreme
    ? NEXUS_SUPREME
    : getStaffVisuals(member);
  const accent = visuals?.color || "#FBBF24";
  const gradeLabel = member.is_nexus_supreme ? NEXUS_SUPREME.label : (visuals?.label || member.role);
  const GradeIcon = member.is_nexus_supreme ? Crown : Shield;
  const roleLabel = member.team_role_label;
  const nationality = member.team_nationality;
  const tagline = member.team_tagline;
  const bio = member.team_bio;
  const specialties = member.team_specialties || [];

  return (
    <article className="team-card" style={{ "--team-accent": accent }} data-testid={`team-card-${member.user_id}`}>
      <div className="team-card-glow" aria-hidden />
      <div className="team-card-top">
        <div className="team-card-avatar" style={{ color: accent }}>
          {avatar ? (
            <img src={avatar} alt="" />
          ) : (
            member.username?.[0]?.toUpperCase() || "?"
          )}
        </div>
        <div className="team-card-meta">
          <HeroName user={member} size="base" />
          <div className="team-card-grade">
            <GradeIcon className="w-3 h-3" />
            {gradeLabel}
          </div>
          {roleLabel && <div className="team-card-role">{roleLabel}</div>}
          {nationality && (
            <div className="team-card-nationality">
              <MapPin className="w-3 h-3" />
              {nationality}
            </div>
          )}
        </div>
      </div>

      {tagline && (
        <p className="team-card-tagline">{tagline.startsWith("«") ? tagline : `« ${tagline} »`}</p>
      )}
      {bio && <p className="team-card-bio">{bio}</p>}

      {specialties.length > 0 && (
        <div className="team-card-tags">
          {specialties.map((tag) => (
            <span key={tag} className="team-card-tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="team-card-foot">
        <span>{member.class_name || t("community.adventurer")}</span>
        <span>{t("friends.levelShort", { level: member.level || 1 })}</span>
      </div>
    </article>
  );
}

function GuildCard({ guild }) {
  const { t } = useI18n();
  return (
    <Link to="/guilds" className="block">
      <PremiumCard tone="emerald" hover className="p-4 h-full">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center text-emerald-300 font-black shrink-0">
            {guild.tag ? guild.tag.slice(0, 3).toUpperCase() : <Swords className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-sm text-emerald-100 truncate">{guild.name}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {t("community.memberCount", { count: guild.member_count || 0, level: guild.level || 1 })}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
        </div>
        {guild.description && (
          <p className="text-xs text-zinc-400 mt-3 line-clamp-2">{guild.description}</p>
        )}
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
          <UserPlus className="w-3 h-3" /> {t("community.joinOrder")}
        </div>
      </PremiumCard>
    </Link>
  );
}

function NewsCard({ article }) {
  const { t, locale } = useI18n();
  const excerpt = (article.excerpt || article.summary || (article.body || "").replace(/<[^>]+>/g, "")).slice(0, 140);
  return (
    <Link to="/feed" className="block">
      <PremiumCard tone="cyan" hover className="p-4 h-full">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="w-3.5 h-3.5 text-cyan-300" />
          <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">
            {article.category || t("community.newsDefault")}
          </span>
        </div>
        <div className="font-display font-bold text-sm text-cyan-100 mb-1 line-clamp-2">{article.title}</div>
        {excerpt && <p className="text-xs text-zinc-400 line-clamp-3">{excerpt}…</p>}
        {article.created_at && (
          <div className="text-[10px] text-zinc-600 mt-2">
            {new Date(article.created_at).toLocaleDateString(locale || "fr-FR")}
          </div>
        )}
      </PremiumCard>
    </Link>
  );
}

export default function Community() {
  const { t } = useI18n();
  const banner = usePageBanner("community");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get("/community/overview");
      setData(res);
    } catch {
      setData({ team: [], team_page: {}, guilds: [], news: [], stats: {} });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats || {};
  const team = data?.team || [];
  const teamPage = data?.team_page || {};
  const guilds = data?.guilds || [];
  const news = data?.news || [];

  return (
    <PageShell wide testid="community-page" banner={banner}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill icon={Users} value={stats.heroes} label={t("community.stat.heroes")} color="#22D3EE" />
          <StatPill icon={Globe} value={stats.online} label={t("community.stat.online")} color="#34D399" />
          <StatPill icon={Swords} value={stats.guilds} label={t("community.stat.orders")} color="#A855F7" />
          <StatPill icon={Shield} value={stats.staff} label={t("community.stat.team")} color="#FBBF24" />
        </div>

        <PremiumCard tone="violet" className="p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(120% 140% at 100% 0%, rgba(88,101,242,0.4), transparent 60%)" }} aria-hidden />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300 font-bold mb-1">{t("community.discordKicker")}</div>
              <h3 className="font-display font-black text-xl text-white">{t("community.discordTitle")}</h3>
              <p className="text-sm text-zinc-400 mt-1">{t("community.discordBody")}</p>
            </div>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl font-display font-black text-white text-sm whitespace-nowrap"
              style={{ background: "linear-gradient(135deg, #5865F2 0%, #404EED 100%)", boxShadow: "0 8px 24px rgba(88,101,242,0.4)" }}
              data-testid="community-discord-btn"
            >
              {t("community.discordBtn")}
            </a>
          </div>
        </PremiumCard>

        <section>
          <div className="team-section-head">
            <h2 className="team-section-title">{teamPage.title || t("community.teamDefault")}</h2>
            {teamPage.subtitle && <p className="team-section-subtitle">{teamPage.subtitle}</p>}
            {teamPage.intro && <p className="team-section-intro">{teamPage.intro}</p>}
          </div>
          {loading ? (
            <div className="text-center py-8 text-zinc-500">{t("common.loading")}</div>
          ) : team.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 italic">{t("community.teamSoon")}</div>
          ) : (
            <div className="team-grid">
              {team.map((m) => <TeamCard key={m.user_id} member={m} />)}
            </div>
          )}
        </section>

        <section>
          <SectionTitle
            icon={Flag}
            title={t("community.recruitment")}
            accent="#34D399"
            action={<Link to="/guilds" className="text-xs font-bold text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1">{t("community.allOrders")} <ChevronRight className="w-3 h-3" /></Link>}
          />
          {guilds.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 italic">{t("community.noGuilds")}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {guilds.map((g) => <GuildCard key={g.guild_id} guild={g} />)}
            </div>
          )}
        </section>

        <section>
          <SectionTitle
            icon={Sparkles}
            title={t("community.feed")}
            accent="#22D3EE"
            action={<Link to="/feed" className="text-xs font-bold text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1">{t("community.viewFeed")} <ChevronRight className="w-3 h-3" /></Link>}
          />
          {news.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 italic">{t("community.noNews")}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {news.map((n) => <NewsCard key={n.news_id} article={n} />)}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
