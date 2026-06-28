import React from "react";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import ContentTranslationBar from "./ContentTranslationBar";

export default function TranslatableText({
  text,
  entityType,
  entityId,
  field = "text",
  enabled = true,
  compact = false,
  className = "",
  as: Tag = "span",
}) {
  const {
    visible,
    isTranslated,
    loading,
    unavailable,
    canRetry,
    translate,
    showOriginal,
    toggleOriginal,
  } = useContentTranslation(text, { entityType, entityId, field, enabled });

  return (
    <>
      <Tag className={className}>{visible}</Tag>
      <ContentTranslationBar
        isTranslated={isTranslated}
        loading={loading}
        unavailable={unavailable}
        canRetry={canRetry}
        showOriginal={showOriginal}
        onTranslate={translate}
        onToggle={toggleOriginal}
        compact={compact}
        className={compact ? "inline ml-1 align-middle" : "mt-1"}
      />
    </>
  );
}
