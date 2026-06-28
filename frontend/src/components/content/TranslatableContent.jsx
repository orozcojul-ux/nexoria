import React from "react";
import ForumRichContent from "@/components/forum/ForumRichContent";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import ContentTranslationBar from "./ContentTranslationBar";
import { stripHtml } from "@/lib/stripHtml";
import { plainTextToRichHtml, resolveSourceHtml } from "@/lib/plain-to-html";

/** Rich or plain UGC body with automatic translation into the viewer language. */
export default function TranslatableContent({
  html,
  plain,
  entityType,
  entityId,
  field = "content",
  auto = true,
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
    failed,
    meta,
    showOriginal,
    toggleOriginal,
  } = useContentTranslation(sourcePlain, {
    html: sourceHtml,
    entityType,
    entityId,
    field,
    auto,
    enabled,
  });

  const showTranslated = !showOriginal
    && !loading
    && isTranslated;

  let body;
  if (showTranslated && visibleHtml) {
    body = <ForumRichContent html={visibleHtml} className={className} />;
  } else if (showTranslated) {
    body = <ForumRichContent html={plainTextToRichHtml(visible)} className={className} />;
  } else {
    body = <ForumRichContent html={sourceHtml || html} plain={plain} className={className} />;
  }

  return (
    <div>
      {body}
      <ContentTranslationBar
        isTranslated={isTranslated || showTranslated}
        loading={loading}
        failed={failed}
        unavailable={Boolean(meta?.unavailable)}
        showOriginal={showOriginal}
        onToggle={toggleOriginal}
        className="mt-2"
      />
    </div>
  );
}
