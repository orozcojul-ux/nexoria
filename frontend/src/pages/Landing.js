import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LandingMockupNav from "@/components/landing/LandingMockupNav";
import NexoriaCopyright from "@/components/NexoriaCopyright";
import { useI18n } from "@/contexts/I18nContext";
import api from "@/lib/api";
import "@/pages/landing.css";

const DISCORD_URL = "https://discord.gg/RC5QjcWDCH";
const CASTLE_BG = "/assets/backgrounds/nexoria-castle.webp";
const LANDING_NEWS_LIMIT = 3;

const CAT_LABELS = {
  event: "pub.news.cat.event",
  update: "pub.news.cat.update",
  community: "pub.news.cat.community",
  announce: "pub.news.cat.announce",
};

const CAT_BANNERS = {
  event: "/assets/banners/events.webp",
  update: "/assets/banners/admin.webp",
  community: "/assets/banners/guilds.webp",
  announce: "/assets/banners/shop.webp",
};

const CAT_ICONS = {
  event: "⚔",
  update: "📜",
  community: "👥",
  announce: "🗺",
};

const DEFAULT_STATUS = { nexusOpen: false, loading: true };

const SYSTEM_ROWS = [
  { id: "web", label: "Web", value: "Opérationnel", tone: "ok" },
  { id: "server", label: "Serveur" },
  { id: "database", label: "Base de données", value: "Opérationnelle", tone: "ok" },
];

export default function Landing() {
  const { t } = useI18n();
  const [nexusOpen, setNexusOpen] = useState(DEFAULT_STATUS.nexusOpen);
  const [loading, setLoading] = useState(DEFAULT_STATUS.loading);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      api.get("/system/online-gate")
        .then((r) => {
          setNexusOpen(r.data?.open !== false);
          setLoading(false);
        })
        .catch(() => {
          setNexusOpen(false);
          setLoading(false);
        });
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.get("/news", { params: { limit: LANDING_NEWS_LIMIT } })
      .then((r) => setNews((r.data || []).slice(0, LANDING_NEWS_LIMIT)))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []);

  const serverLabel = loading ? "…" : nexusOpen ? "Ouvert" : "Fermé";
  const serverTone = loading ? "pending" : nexusOpen ? "open" : "closed";

  const resolveRow = (row) => {
    if (row.id === "server") {
      return { ...row, value: serverLabel, tone: serverTone };
    }
    return row;
  };

  return (
    <div className="lm-page" data-testid="landing-page">
      <div className="lm-page-bg" style={{ backgroundImage: `url(${CASTLE_BG})` }} aria-hidden />
      <div className="lm-page-mist" aria-hidden />
      <div className="lm-page-vignette" aria-hidden />

      <LandingMockupNav />

      <main className="lm-main">
        <div className="lm-grid">
          <section className="lm-col-main">
            <div className="lm-welcome lm-frame-gold" data-testid="landing-hero">
              <div className="lm-welcome-inner">
                <p className="lm-welcome-kicker">MMORPG Fantasy · Royaume en ligne</p>
                <h1 className="lm-welcome-title">NEXORIA</h1>
                <p className="lm-welcome-tagline">
                  Forge ton héros, explore le Nexus et écris ta légende aux côtés des Sentinelles.
                </p>
                <div className="lm-welcome-actions">
                  <Link to="/register" className="lm-btn lm-btn--gold" data-testid="landing-cta-register">
                    Créer un héros
                  </Link>
                  <Link to="/login" className="lm-btn lm-btn--cyan" data-testid="landing-cta-login">
                    Connexion
                  </Link>
                </div>
              </div>
            </div>

            <div className="lm-news-panel lm-frame-gold" data-testid="landing-news-panel">
              <h2 className="lm-panel-title">DERNIÈRES ACTUALITÉS</h2>
              <div data-testid="landing-news">
                {newsLoading && (
                  <p className="lm-news-empty" data-testid="landing-news-loading">
                    Chargement des chroniques…
                  </p>
                )}
                {!newsLoading && news.length === 0 && (
                  <p className="lm-news-empty" data-testid="landing-news-empty">
                    Aucune actualité publiée pour le moment. Revenez bientôt — les Sentinelles préparent de nouvelles chroniques.
                  </p>
                )}
                {!newsLoading && news.length > 0 && (
                  <div className="lm-news-magazine">
                    {news[0] && (() => {
                      const item = news[0];
                      const cat = item.category || "announce";
                      const catKey = CAT_LABELS[cat] || CAT_LABELS.announce;
                      const image = item.image_url || CAT_BANNERS[cat] || CAT_BANNERS.announce;
                      const icon = CAT_ICONS[cat] || CAT_ICONS.announce;
                      const summary = (item.content || "").trim();
                      return (
                        <Link
                          key={item.news_id}
                          to={`/news/${item.news_id}`}
                          className="lm-news-feature lm-frame-cyan"
                          data-testid={`landing-news-${item.news_id}`}
                        >
                          <div className="lm-news-feature-media" style={{ backgroundImage: `url(${image})` }}>
                            <div className="lm-news-feature-shade" />
                          </div>
                          <div className="lm-news-feature-body">
                            <span className="lm-news-cat">{t(catKey)}</span>
                            <h3 className="lm-news-title">{item.title}</h3>
                            {summary && <p className="lm-news-summary">{summary}</p>}
                          </div>
                          <span className="lm-news-icon" aria-hidden>{icon}</span>
                        </Link>
                      );
                    })()}
                    {news.length > 1 && (
                      <div className="lm-news-stack">
                        {news.slice(1).map((item) => {
                          const cat = item.category || "announce";
                          const catKey = CAT_LABELS[cat] || CAT_LABELS.announce;
                          const image = item.image_url || CAT_BANNERS[cat] || CAT_BANNERS.announce;
                          const icon = CAT_ICONS[cat] || CAT_ICONS.announce;
                          const summary = (item.content || "").trim();
                          return (
                            <Link
                              key={item.news_id}
                              to={`/news/${item.news_id}`}
                              className="lm-news-card lm-frame-cyan"
                              data-testid={`landing-news-${item.news_id}`}
                            >
                              <div className="lm-news-card-thumb" style={{ backgroundImage: `url(${image})` }} />
                              <div className="lm-news-card-body">
                                <span className="lm-news-cat">{t(catKey)}</span>
                                <h3 className="lm-news-title">{item.title}</h3>
                                {summary && <p className="lm-news-summary">{summary}</p>}
                              </div>
                              <span className="lm-news-icon" aria-hidden>{icon}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!newsLoading && news.length > 0 && (
                <Link to="/feed" className="lm-news-more" data-testid="landing-news-more">
                  Voir toutes les actualités →
                </Link>
              )}
            </div>
          </section>

          <aside className="lm-col-side">
            <div className="lm-stats-panel" data-testid="landing-system-stats">
              <div className="lm-stats-gear" aria-hidden>
                <div className="lm-stats-gear-core" />
              </div>
              <h2 className="lm-stats-title">STATISTIQUES SYSTÈME</h2>
              <ul className="lm-stats-list">
                {SYSTEM_ROWS.map((row) => {
                  const item = resolveRow(row);
                  return (
                    <li key={item.id}>
                      <span className="lm-stats-label">{item.label}</span>
                      <span
                        className={`lm-stats-value lm-stats-value--${item.tone}`}
                        data-testid={`landing-stat-${item.id}`}
                      >
                        {item.value}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="lm-discord-panel"
              data-testid="landing-discord-panel"
            >
              <div className="lm-discord-wings" aria-hidden />
              <div className="lm-discord-rune" aria-hidden />
              <span className="lm-discord-label">REJOINDRE NOTRE DISCORD</span>
              <svg viewBox="0 0 24 24" className="lm-discord-svg" fill="currentColor" aria-hidden>
                <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
          </aside>
        </div>
      </main>

      <NexoriaCopyright className="lm-footer-copy" />
    </div>
  );
}
