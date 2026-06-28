import React from "react";
import ForumRichContent from "@/components/forum/ForumRichContent";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import ContentTranslationBar from "./ContentTranslationBar";
import { stripHtml } from "@/lib/stripHtml";
import { plainTextToRichHtml, resolveSourceHtml } from "@/lib/plain-to-html";

/** Rich or plain UGC body — auto-translated into the viewer's UI language. */
export default function TranslatableContent({
  html,
  plain,
  entityType,
  entityId,
  field = "content",
  enabled = true,
  className = "",
}) {
  const sourceHtml = resolveSourceHtml(html, plain);
  const sourcePlain = (plain || "").trim()
    || stripHtml(sourceHtml, { preserveBreaks: true });
  const {
    visible,
    visibleHtml,
    isTranslated,
    loading,
    unavailable,
    canRetry,
    translate,
    showOriginal,
    toggleOriginal,
  } = useContentTranslation(sourcePlain, {
    html: sourceHtml,
    entityType,
    entityId,
    field,
    enabled,
  });

  const translatedHtmlReady = Boolean(
    !showOriginal
    && !loading
    && visibleHtml?.trim()
    && visibleHtml.trim() !== sourceHtml.trim(),
  );
  const translatedPlainReady = Boolean(
    !showOriginal
    && !loading
    && !translatedHtmlReady
    && visible?.trim()
    && visible.trim() !== sourcePlain.trim(),
  );

  let body;
  if (translatedHtmlReady) {
    body = <ForumRichContent html={visibleHtml} className={className} />;
  } else if (translatedPlainReady) {
    body = <ForumRichContent html={plainTextToRichHtml(visible)} className={className} />;
  } else {
    body = <ForumRichContent html={sourceHtml || html} plain={plain} className={className} />;
  }

  return (
    <div>
      {body}
      <ContentTranslationBar
        isTranslated={isTranslated || translatedHtmlReady || translatedPlainReady}
        loading={loading}
        unavailable={unavailable}
        canRetry={canRetry}
        showOriginal={showOriginal}
        onTranslate={translate}
        onToggle={toggleOriginal}
        className="mt-2"
      />
    </div>
  );
}
