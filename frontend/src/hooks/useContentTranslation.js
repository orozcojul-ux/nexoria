import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { translateContent } from "@/lib/content-translate";
import { useI18n } from "@/i18n/LanguageProvider";

/**
 * Auto-translate user-generated content into the viewer's UI language.
 * When `html` is provided, formatting (paragraphs, bold, highlights) is preserved.
 */
export function useContentTranslation(
  text,
  {
    html,
    entityType,
    entityId,
    field,
    auto = true,
    enabled = true,
    sourceLang,
  } = {},
) {
  const { lang } = useI18n();
  const original = text || "";
  const originalHtml = (html || "").trim();
  const [display, setDisplay] = useState(original);
  const [displayHtml, setDisplayHtml] = useState(originalHtml || null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);

  const resolvedSourceLang = sourceLang ?? (lang === "fr" ? undefined : "fr");
  const hasSource = originalHtml.length >= 2 || original.trim().length >= 2;

  useEffect(() => {
    setShowOriginal(false);
    if (!enabled || !auto || !hasSource) {
      setDisplay(original);
      setDisplayHtml(originalHtml || null);
      setMeta(null);
      setFailed(false);
      setLoading(false);
      return undefined;
    }

    const requestId = ++requestRef.current;
    setLoading(true);
    setFailed(false);

    translateContent({
      text: original,
      html: originalHtml || undefined,
      targetLang: lang,
      sourceLang: resolvedSourceLang,
      entityType,
      entityId,
      field,
    })
      .then((data) => {
        if (requestId !== requestRef.current) return;
        setMeta(data);
        if (data?.same_language || data?.unavailable) {
          setDisplay(original);
          setDisplayHtml(originalHtml || null);
        } else if (data?.format === "html" && data?.text) {
          setDisplayHtml(data.text);
          setDisplay(original);
        } else {
          setDisplayHtml(null);
          setDisplay(data?.text || original);
        }
        setFailed(false);
      })
      .catch(() => {
        if (requestId !== requestRef.current) return;
        setDisplay(original);
        setDisplayHtml(originalHtml || null);
        setFailed(true);
      })
      .finally(() => {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      });

    return () => {
      requestRef.current += 1;
    };
  }, [original, originalHtml, lang, entityType, entityId, field, auto, enabled, resolvedSourceLang, hasSource]);

  const toggleOriginal = useCallback(() => {
    setShowOriginal((v) => !v);
  }, []);

  const visible = showOriginal ? original : display;
  const visibleHtml = showOriginal ? (originalHtml || null) : displayHtml;

  const htmlChanged = Boolean(
    originalHtml
    && visibleHtml
    && visibleHtml.trim() !== originalHtml.trim(),
  );
  const plainChanged = Boolean(
    visible?.trim()
    && visible.trim() !== original.trim(),
  );

  const isTranslated = Boolean(
    meta
    && !meta.same_language
    && !meta.unavailable
    && !showOriginal
    && (htmlChanged || plainChanged),
  );

  return useMemo(
    () => ({
      visible,
      visibleHtml,
      original,
      originalHtml,
      display,
      displayHtml,
      showOriginal,
      toggleOriginal,
      isTranslated,
      loading,
      failed,
      meta,
    }),
    [visible, visibleHtml, original, originalHtml, display, displayHtml, showOriginal, toggleOriginal, isTranslated, loading, failed, meta],
  );
}
