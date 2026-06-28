import React from "react";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import ContentTranslationBar from "./ContentTranslationBar";

export default function TranslatableText({
  text,
  entityType,
  entityId,
  field = "text",
  auto = true,
  enabled = true,
  compact = false,
  className = "",
  as: Tag = "span",
}) {
  const {
    visible,
    isTranslated,
    loading,
    failed,
    meta,
    showOriginal,
    toggleOriginal,
  } = useContentTranslation(text, { entityType, entityId, field, auto, enabled });

  return (
    <>
      <Tag className={className}>{visible}</Tag>
      {!compact && (
        <ContentTranslationBar
          isTranslated={isTranslated}
          loading={loading}
          failed={failed}
          unavailable={Boolean(meta?.unavailable)}
          showOriginal={showOriginal}
          onToggle={toggleOriginal}
          className="mt-1"
        />
      )}
    </>
  );
}
