import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users, Shield, Crown, Newspaper, Swords, Sparkles, ChevronRight,
  Globe, Flag, MapPin, ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import { PageShell } from "@/components/ui-premium";
import HeroName from "@/components/HeroName";
import HeroCardOpener from "@/components/HeroCardOpener";
import { getUserAvatarUrl } from "@/lib/user-avatar";
import { getStaffVisuals, NEXUS_SUPREME } from "@/lib/staff-roles";
import { translateClassName } from "@/lib/translate-class";
import { usePageBanner } from "@/lib/page-banners";
import { useI18n } from "@/contexts/I18nContext";
import "./community-team.css";

const DISCORD_URL = process.env.REACT_APP_DISCORD_URL || "https://discord.gg/RC5QjcWDCH";

const TEAM_PAGE_DEFAULTS = {
  title: "L'Équipe",
  subtitle: "Les gardiens du Nexus",
  intro: "Sages, Sentinelles et artisans du royaume — ceux qui façonnent l'expérience NEXORIA.",
};

function resolveTeamPageField(value, defaultFr, i18nKey, t) {
  const trimmed = (value || "").trim();
  if (!trimmed || trimmed === defaultFr) return t(i18nKey);
  return trimmed;
}

function getStaffGradeLabel(member, visuals, t) {
  if (member.is_nexus_supreme) return t(NEXUS_SUPREME.labelKey);
  if (member.is_official_sentinel) return t("community.naria.grade");
  if (visuals?.labelKey) return t(visuals.labelKey);
  return visuals?.label || member.role;
}

function TeamMemberCard({ member }) {
  const { t } = useI18n();
  const isOfficialSentinel = member.is_official_sentinel;
  const avatar = getUserAvatarUrl(member);
  const visuals = member.is_nexus_supreme
    ? NEXUS_SUPREME
    : isOfficialSentinel
      ? { color: "#8B5CF6", labelKey: "community.naria.grade" }
      : getStaffVisuals(member);
  const accent = visuals?.color || "#FBBF24";
  const gradeLabel = getStaffGradeLabel(member, visuals, t);
  const GradeIcon = member.is_nexus_supreme ? Crown : Shield;
  const roleLabel = member.team_role_label;
  const nationality = member.team_nationality;
  const tagline = member.team_tagline;
  const bio = member.team_bio;
  const specialties = member.team_specialties || [];

  const cardInner = (
    <>
      <div className="team-card-shine" aria-hidden />
      <div className="team-card-glow" aria-hidden />

      <header className="team-card-header">
        <div className="team-card-avatar-wrap" style={{ "--team-accent": accent }}>
          <div className={`team-card-avatar${isOfficialSentinel ? " team-card-avatar--sentinel" : ""}`}>
            {avatar ? (
              <img src={avatar} alt="" />
            ) : (
              member.username?.[0]?.toUpperCase() || "?"
            )}
          </div>
          {!isOfficialSentinel && (
            <span className="team-card-profile-hint">{t("community.viewProfile")}</span>
          )}
        </div>

        <div className="team-card-meta">
          <div className="team-card-name-row">
            <HeroName user={member} size="base" />
            {!isOfficialSentinel && <ExternalLink className="team-card-link-icon w-3.5 h-3.5" aria-hidden />}
          </div>
          <div className="team-card-grade" style={{ color: accent }}>
            <GradeIcon className="w-3 h-3" />
            {gradeLabel}
          </div>
          {roleLabel && <p className="team-card-role">{roleLabel}</p>}
          {isOfficialSentinel && (
            <>
              <span className="team-card-sentinel-badge">{t("community.naria.badge")}</span>
              <span className="team-card-sentinel-official">{t("community.naria.status")}</span>
            </>
          )}
          {nationality && (
            <p className="team-card-nationality">
              <MapPin className="w-3 h-3" />
              {nationality}
            </p>
          )}
        </div>
      </header>

      {tagline && (
        <blockquote className="team-card-tagline">
          {tagline.startsWith("«") ? tagline : `« ${tagline} »`}
        </blockquote>
      )}

      {bio && <p className="team-card-bio">{bio}</p>}

      {specialties.length > 0 && (
        <ul className="team-card-tags" aria-label={t("community.specialties")}>
          {specialties.map((tag) => (
            <li key={tag} className="team-card-tag">{tag}</li>
          ))}
        </ul>
      )}

      <footer className="team-card-foot">
        {isOfficialSentinel ? (
          <span>{t("community.naria.footer")}</span>
        ) : (
          <>
            <span>{member.class_name ? translateClassName(t, member.class_name) : t("community.adventurer")}</span>
            <span>{t("friends.levelShort", { level: member.level || 1 })}</span>
          </>
        )}
      </footer>
    </>
  );

  if (isOfficialSentinel) {
    return (
      <article
        className="team-card team-card--sentinel team-card--static"
        style={{ "--team-accent": accent }}
        data-testid={`team-card-${member.user_id}`}
      >
        {cardInner}
      </article>
    );
  }

  return (
    <HeroCardOpener
      userId={member.user_id}
      username={member.username}
      className="team-card team-card--clickable"
      style={{ "--team-accent": accent }}
      testid={`team-card-${member.user_id}`}
    >
      {cardInner}
    </HeroCardOpener>
  );
}

function StatTile({ icon: Icon, value, label, color }) {
  return (
    <div className="community-stat-tile" style={{ "--stat-color": color }}>
      <div className="community-stat-icon">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="community-stat-value">{value ?? 0}</div>
        <div className="community-stat-label">{label}</div>
      </div>
    </div>
  );
}

function GuildCard({ guild }) {
  const { t } = useI18n();
  return (
    <Link to="/guilds" className="community-guild-card">
      <div className="community-guild-emblem">
        {guild.tag ? guild.tag.slice(0, 3).toUpperCase() : <Swords className="w-5 h-5" />}
      </div>
      <div className="community-guild-body">
        <div className="community-guild-name">{guild.name}</div>
        <div className="community-guild-meta">
          {t("community.memberCount", { count: guild.member_count || 0, level: guild.level || 1 })}
        </div>
        {guild.description && <p className="community-guild-desc">{guild.description}</p>}
      </div>
      <ChevronRight className="w-4 h-4 community-guild-chevron" />
    </Link>
  );
}

function NewsCard({ article }) {
  const { t, locale } = useI18n();
  const excerpt = (article.excerpt || article.summary || (article.body || "").replace(/<[^>]+>/g, "")).slice(0, 120);
  return (
    <Link to="/feed" className="community-news-card">
      <div className="community-news-kicker">
        <Newspaper className="w-3.5 h-3.5" />
        {article.category || t("community.newsDefault")}
      </div>
      <h3 className="community-news-title">{article.title}</h3>
      {excerpt && <p className="community-news-excerpt">{excerpt}…</p>}
      {article.created_at && (
        <time className="community-news-date">
          {new Date(article.created_at).toLocaleDateString(locale || "fr-FR")}
        </time>
      )}
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
  const teamTitle = resolveTeamPageField(teamPage.title, TEAM_PAGE_DEFAULTS.title, "community.teamDefault", t);
  const teamSubtitle = resolveTeamPageField(teamPage.subtitle, TEAM_PAGE_DEFAULTS.subtitle, "community.teamSubtitle", t);
  const teamIntro = resolveTeamPageField(teamPage.intro, TEAM_PAGE_DEFAULTS.intro, "community.teamIntro", t);

  return (
    <PageShell wide testid="community-page" banner={banner}>
      <div className="community-page">
        {/* Hero */}
        <section className="community-hero">
          <div className="community-hero-bg" aria-hidden />
          <div className="community-hero-content">
            <p className="community-hero-kicker">{t("community.pageKicker")}</p>
            <h1 className="community-hero-title">{t("community.pageTitle")}</h1>
            <p className="community-hero-lead">{t("community.pageLead")}</p>
            <div className="community-stats-row">
              <StatTile icon={Users} value={stats.heroes} label={t("community.stat.heroes")} color="#22D3EE" />
              <StatTile icon={Globe} value={stats.online} label={t("community.stat.online")} color="#34D399" />
              <StatTile icon={Swords} value={stats.guilds} label={t("community.stat.orders")} color="#A855F7" />
              <StatTile icon={Shield} value={stats.staff} label={t("community.stat.team")} color="#FBBF24" />
            </div>
          </div>
        </section>

        {/* Équipe — section principale */}
        <section className="community-team-section" aria-labelledby="community-team-heading">
          <div className="community-team-panel">
            <div className="community-team-panel-head">
              <div className="community-team-panel-icon" aria-hidden>
                <Shield className="w-6 h-6" />
              </div>
              <div className="community-team-panel-titles">
                <p className="community-team-panel-kicker">{teamSubtitle}</p>
                <h2 id="community-team-heading" className="community-team-panel-title">{teamTitle}</h2>
                {teamIntro && <p className="community-team-panel-intro">{teamIntro}</p>}
              </div>
            </div>

            {loading ? (
              <div className="community-team-loading">{t("common.loading")}</div>
            ) : team.length === 0 ? (
              <div className="community-team-empty">{t("community.teamSoon")}</div>
            ) : (
              <div className="team-grid team-grid--premium">
                {team.map((m) => (
                  <TeamMemberCard key={m.user_id} member={m} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Discord */}
        <section className="community-discord-strip">
          <div className="community-discord-inner">
            <div>
              <p className="community-discord-kicker">{t("community.discordKicker")}</p>
              <h3 className="community-discord-title">{t("community.discordTitle")}</h3>
              <p className="community-discord-body">{t("community.discordBody")}</p>
            </div>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="community-discord-btn"
              data-testid="community-discord-btn"
            >
              {t("community.discordBtn")}
            </a>
          </div>
        </section>

        {/* Guildes + Actualités */}
        <div className="community-secondary-grid">
          <section className="community-block">
            <div className="community-block-head">
              <Flag className="w-5 h-5 text-emerald-400" />
              <h2>{t("community.recruitment")}</h2>
              <Link to="/guilds" className="community-block-link">
                {t("community.allOrders")} <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {guilds.length === 0 ? (
              <p className="community-block-empty">{t("community.noGuilds")}</p>
            ) : (
              <div className="community-guild-list">
                {guilds.map((g) => <GuildCard key={g.guild_id} guild={g} />)}
              </div>
            )}
          </section>

          <section className="community-block">
            <div className="community-block-head">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2>{t("community.feed")}</h2>
              <Link to="/feed" className="community-block-link">
                {t("community.viewFeed")} <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {news.length === 0 ? (
              <p className="community-block-empty">{t("community.noNews")}</p>
            ) : (
              <div className="community-news-list">
                {news.map((n) => <NewsCard key={n.news_id} article={n} />)}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
