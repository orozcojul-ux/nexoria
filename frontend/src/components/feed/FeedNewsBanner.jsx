import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Newspaper, ArrowRight, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";

const CAT_LABELS = {
  event: "pub.news.cat.event",
  update: "pub.news.cat.update",
  community: "pub.news.cat.community",
  announce: "pub.news.cat.announce",
};

const FALLBACK_BANNERS = [
  "/assets/backgrounds/nexoria-castle.webp",
  "/assets/backgrounds/nexus-realm.webp",
  "/assets/backgrounds/forum-banner.webp",
];

export default function FeedNewsBanner() {
  const { t, fmtDate } = useI18n();
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    api.get("/news", { params: { limit: 6, featured_only: true } })
      .then((r) => setItems(r.data || []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const id = setInterval(() => setIdx((i) => (i + 1) % items.length), 8000);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;

  const n = items[idx];
  const banner = n.image_url || FALLBACK_BANNERS[idx % FALLBACK_BANNERS.length];
  const catKey = CAT_LABELS[n.category] || CAT_LABELS.announce;

  return (
    <motion.div
      key={n.news_id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl border border-[var(--nx-border)] overflow-hidden bg-[var(--nx-surface)]"
      data-testid="feed-news-banner"
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${banner})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#06040c]/95 via-[#0a0613]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06040c]/90 via-transparent to-transparent" />

      <div className="relative px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center shrink-0">
          <Newspaper className="w-4 h-4 text-cyan-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-cyan-400/90 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {t("feed.news.kicker")}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-amber-400/80 border border-amber-500/25 px-1.5 py-0.5 rounded">
              {t(catKey)}
            </span>
            <span className="text-[9px] text-zinc-600 font-mono-stat ml-auto">
              {fmtDate(n.created_at, { day: "numeric", month: "short" })}
            </span>
          </div>
          <h2 className="font-display font-bold text-sm sm:text-base text-white leading-snug line-clamp-1">
            {n.title}
          </h2>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
            {n.content}
          </p>
        </div>
        {items.length > 1 && (
          <div className="hidden sm:flex flex-col gap-1 shrink-0">
            {items.slice(0, 4).map((item, i) => (
              <button
                key={item.news_id}
                type="button"
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-cyan-400 scale-125" : "bg-white/20 hover:bg-white/40"}`}
                aria-label={`Article ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {items.length > 1 && (
        <div className="relative px-4 pb-2 flex gap-1 sm:hidden">
          {items.slice(0, 4).map((item, i) => (
            <button
              key={item.news_id}
              type="button"
              onClick={() => setIdx(i)}
              className={`flex-1 h-0.5 rounded-full ${i === idx ? "bg-cyan-400" : "bg-white/15"}`}
            />
          ))}
        </div>
      )}

      <Link
        to="/"
        className="absolute top-3 right-3 text-[9px] uppercase tracking-widest text-zinc-500 hover:text-cyan-300 flex items-center gap-0.5"
      >
        {t("feed.news.more")} <ArrowRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}
