import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Newspaper, Calendar, User } from "lucide-react";
import api from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { PremiumButton } from "@/components/ui-premium";
import { ReportButton } from "@/components/ReportContentModal";
import NewsComments from "@/components/news/NewsComments";
import TranslatableText from "@/components/content/TranslatableText";
import TranslatableContent from "@/components/content/TranslatableContent";
import { useAuth } from "@/contexts/AuthContext";

const CAT_LABELS = {
  event: "pub.news.cat.event",
  update: "pub.news.cat.update",
  community: "pub.news.cat.community",
  announce: "pub.news.cat.announce",
};

const FALLBACK_BANNER = "/assets/backgrounds/nexoria-castle.webp";

export default function NewsArticle() {
  const { newsId } = useParams();
  const { t, fmtDate } = useI18n();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api.get(`/news/${newsId}`)
      .then((r) => setArticle(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [newsId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-zinc-500 italic" data-testid="news-article-loading">
        Chargement…
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4" data-testid="news-article-not-found">
        <p className="text-zinc-400">Cet article n&apos;existe pas ou n&apos;est plus publié.</p>
        <Link to="/feed">
          <PremiumButton variant="cyan" size="sm" icon={ArrowLeft}>Retour au tableau de bord</PremiumButton>
        </Link>
      </div>
    );
  }

  const catKey = CAT_LABELS[article.category] || CAT_LABELS.announce;
  const banner = article.image_url || FALLBACK_BANNER;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10" data-testid="news-article-page">
      <Link
        to="/feed"
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 hover:text-cyan-300 font-bold mb-6 transition-colors"
        data-testid="news-article-back"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("news.back")}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[var(--nx-border)] overflow-hidden bg-[var(--nx-surface)]"
      >
        <div className="relative h-40 sm:h-52">
          <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0613] via-[#0a0613]/60 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] font-bold text-cyan-300 border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 rounded">
              <Newspaper className="w-3 h-3" />
              {t(catKey)}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white leading-tight mb-4" data-testid="news-article-title">
            <TranslatableText
              as="span"
              text={article.title}
              entityType="news"
              entityId={article.news_id}
              field="title"
            />
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-6 pb-6 border-b border-white/10">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400/80" />
              {fmtDate(article.created_at, { day: "numeric", month: "long", year: "numeric" })}
            </span>
            {article.author && (
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-violet-400/80" />
                {article.author}
              </span>
            )}
            {user && (
              <ReportButton
                targetType="news_article"
                targetId={article.news_id}
                contextLabel={article.title}
              />
            )}
          </div>

          <div data-testid="news-article-content">
            <TranslatableContent
              html={article.content_html}
              plain={article.content}
              entityType="news"
              entityId={article.news_id}
              field="content"
              className="text-sm sm:text-base"
            />
          </div>
        </div>
      </motion.div>

      <NewsComments newsId={article.news_id} />
    </article>
  );
}
