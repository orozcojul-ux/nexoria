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
    showOriginal,
    toggleOriginal,
  } = useContentTranslation(sourceText, { entityType, entityId, field, auto, enabled });

  let body;
  if (showOriginal || !isTranslated) {
    body = <ForumRichContent html={html} plain={plain} className={className} />;
  } else {
    body = <ForumRichContent plain={visible || plain} className={className} />;
  }

  return (
    <div>
      {body}
      <ContentTranslationBar
        isTranslated={isTranslated}
        loading={loading}
        showOriginal={showOriginal}
        onToggle={toggleOriginal}
        className="mt-2"
      />
    </div>
  );
}
