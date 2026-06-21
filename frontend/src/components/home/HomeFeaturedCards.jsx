import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
import HomePanel from "./HomePanel";
import {
  CAT_LABELS,   CAT_BANNERS, NEWS_FEATURED_FALLBACK, SHOP_FEATURED, WHEEL_FEATURED, CRAFT_FEATURED,
} from "./home-constants";

function FeaturedCard({ to, category, title, description, image, testid, index }) {
  const inner = (
    <>
      <div className="feed-news-card-media" style={{ backgroundImage: `url(${image})` }}>
        <div className="feed-news-card-shade" />
      </div>
      <div className="feed-news-card-body feed-news-card-body--promo">
        <span className="feed-news-badge">{category}</span>
        <h3 className="feed-news-card-title">{title}</h3>
        {description && <p className="feed-news-excerpt">{description}</p>}
      </div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="feed-featured-card-wrap"
    >
      {to ? (
        <Link to={to} className="feed-news-card feed-news-card--featured" data-testid={testid}>
          {inner}
        </Link>
      ) : (
        <div className="feed-news-card feed-news-card--featured feed-news-card--static" data-testid={testid}>
          {inner}
        </div>
      )}
    </motion.div>
  );
}

export default function HomeFeaturedCards({ news = [], t }) {
  const lead = news[0];
  const leadCat = lead?.category || "announce";
  const newsCard = lead
    ? {
        to: `/news/${lead.news_id}`,
        category: t(CAT_LABELS[leadCat] || CAT_LABELS.announce),
        title: lead.title,
        description: (lead.content || "").trim().slice(0, 160),
        image: lead.image_url || CAT_BANNERS[leadCat] || CAT_BANNERS.announce,
        testid: `feed-featured-news-${lead.news_id}`,
      }
    : {
        to: null,
        category: NEWS_FEATURED_FALLBACK.category,
        title: NEWS_FEATURED_FALLBACK.title,
        description: "Aucune actualité disponible pour le moment.",
        image: NEWS_FEATURED_FALLBACK.image,
        testid: "feed-featured-news-empty",
      };

  return (
    <HomePanel
      label="À la une — Actualités du Royaume"
      icon={Newspaper}
      count={news.length > 0 ? `${news.length} article${news.length > 1 ? "s" : ""}` : undefined}
    >
      <div className="feed-featured-grid feed-featured-grid--promo feed-featured-grid--quad">
        <FeaturedCard {...newsCard} index={0} />
        <FeaturedCard
          to={CRAFT_FEATURED.to}
          category={CRAFT_FEATURED.category}
          title={CRAFT_FEATURED.title}
          description={CRAFT_FEATURED.description}
          image={CRAFT_FEATURED.image}
          testid="feed-featured-craft"
          index={1}
        />
        <FeaturedCard
          to={WHEEL_FEATURED.to}
          category={WHEEL_FEATURED.category}
          title={WHEEL_FEATURED.title}
          description={WHEEL_FEATURED.description}
          image={WHEEL_FEATURED.image}
          testid="feed-featured-wheel"
          index={2}
        />
        <FeaturedCard
          to={SHOP_FEATURED.to}
          category={SHOP_FEATURED.category}
          title={SHOP_FEATURED.title}
          description={SHOP_FEATURED.description}
          image={SHOP_FEATURED.image}
          testid="feed-featured-shop"
          index={3}
        />
      </div>
    </HomePanel>
  );
}
