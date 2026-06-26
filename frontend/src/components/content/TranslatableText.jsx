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
  className = "",
  as: Tag = "span",
}) {
  const {
    visible,
    isTranslated,
    loading,
    showOriginal,
    toggleOriginal,
  } = useContentTranslation(text, { entityType, entityId, field, auto, enabled });

  return (
    <>
      <Tag className={className}>{visible}</Tag>
      <ContentTranslationBar
        isTranslated={isTranslated}
        loading={loading}
        showOriginal={showOriginal}
        onToggle={toggleOriginal}
        className="mt-1"
      />
    </>
  );
}
