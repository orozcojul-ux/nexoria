import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
import HomePanel from "./HomePanel";
import { CAT_LABELS, CAT_BANNERS } from "./home-constants";

const FEATURED_LIMIT = 4;

function FeaturedCard({ article, t, index }) {
  const cat = article.category || "announce";
  const description = (article.content || "").trim().slice(0, 160);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="feed-featured-card-wrap"
    >
      <Link
        to={`/news/${article.news_id}`}
        className="feed-news-card feed-news-card--featured"
        data-testid={`feed-featured-news-${article.news_id}`}
      >
        <div
          className="feed-news-card-media"
          style={{ backgroundImage: `url(${article.image_url || CAT_BANNERS[cat] || CAT_BANNERS.announce})` }}
        >
          <div className="feed-news-card-shade" />
        </div>
        <div className="feed-news-card-body feed-news-card-body--promo">
          <span className="feed-news-badge">{t(CAT_LABELS[cat] || CAT_LABELS.announce)}</span>
          <h3 className="feed-news-card-title">{article.title}</h3>
          {description && <p className="feed-news-excerpt">{description}</p>}
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomeFeaturedCards({ news = [], t }) {
  const articles = news.filter((n) => n.published !== false).slice(0, FEATURED_LIMIT);
  const gridClass = articles.length <= 1
    ? "feed-featured-grid feed-featured-grid--promo"
    : articles.length === 2
      ? "feed-featured-grid feed-featured-grid--promo"
      : articles.length === 3
        ? "feed-featured-grid feed-featured-grid--promo feed-featured-grid--triple"
        : "feed-featured-grid feed-featured-grid--promo feed-featured-grid--quad";

  return (
    <HomePanel
      label={`${t("feed.news.kicker")} — ${t("feed.news.section")}`}
      icon={Newspaper}
      count={articles.length > 0 ? `${articles.length} article${articles.length > 1 ? "s" : ""}` : undefined}
      testid="feed-news-featured"
    >
      {articles.length === 0 ? (
        <p className="feed-news-empty" data-testid="feed-featured-news-empty">
          {t("feed.news.empty")}
        </p>
      ) : (
        <div className={gridClass}>
          {articles.map((article, index) => (
            <FeaturedCard key={article.news_id} article={article} t={t} index={index} />
          ))}
        </div>
      )}
    </HomePanel>
  );
}

export { FEATURED_LIMIT as HOME_FEATURED_NEWS_LIMIT };
