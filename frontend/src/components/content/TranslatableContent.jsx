import React from "react";
import ForumRichContent from "@/components/forum/ForumRichContent";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import ContentTranslationBar from "./ContentTranslationBar";

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
  const sourceText = (plain || "").trim()
    || (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const {
    visible,
    isTranslated,
    loading,
    failed,
    meta,
    showOriginal,
    toggleOriginal,
  } = useContentTranslation(sourceText, { entityType, entityId, field, auto, enabled });

  const showTranslated = !showOriginal
    && !loading
    && Boolean(visible?.trim())
    && visible.trim() !== sourceText.trim();

  let body;
  if (showTranslated) {
    body = <ForumRichContent plain={visible} className={className} />;
  } else {
    body = <ForumRichContent html={html} plain={plain} className={className} />;
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
