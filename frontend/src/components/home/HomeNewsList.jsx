import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Scroll } from "lucide-react";
import HomePanel from "./HomePanel";
import { CAT_LABELS, CAT_BANNERS } from "./home-constants";
import TranslatableText from "@/components/content/TranslatableText";

function NewsRow({ article, t }) {
  const cat = article.category || "announce";
  const image = article.image_url || CAT_BANNERS[cat] || CAT_BANNERS.announce;
  return (
    <Link
      to={`/news/${article.news_id}`}
      className="feed-news-row"
      data-testid={`feed-news-${article.news_id}`}
    >
      <div className="feed-news-row-img" style={{ backgroundImage: `url(${image})` }} />
      <div className="feed-news-row-body">
        <span className="feed-news-row-cat">{t(CAT_LABELS[cat] || CAT_LABELS.announce)}</span>
        <h3 className="feed-news-row-title">
          <TranslatableText
            as="span"
            text={article.title}
            entityType="news"
            entityId={article.news_id}
            field="title"
          />
        </h3>
      </div>
      <span className="feed-news-row-btn">
        Lire <ArrowRight className="w-2.5 h-2.5 inline ml-0.5" />
      </span>
    </Link>
  );
}

export default function HomeNewsList({ news = [], t, skip }) {
  const offset = skip ?? leadOffset(news);
  const items = news.filter((n) => n.published !== false).slice(offset);
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
    >
      <HomePanel label={t("feed.news.section")} icon={Scroll} count={items.length}>
        <div className="feed-news-list">
          {items.map((n) => (
            <NewsRow key={n.news_id} article={n} t={t} />
          ))}
        </div>
      </HomePanel>
    </motion.div>
  );
}

/** Skip first article when it is already shown as lead card content. */
function leadOffset(news) {
  return news.length > 0 ? 1 : 0;
}
