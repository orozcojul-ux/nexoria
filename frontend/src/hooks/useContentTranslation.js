import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { translateContent, translateRichHtml } from "@/lib/content-translate";
import { looksLikeHtml } from "@/lib/html-translate-client";
import { useI18n } from "@/i18n/LanguageProvider";

function pickTranslatedHtml(data) {
  if (!data?.text) return null;
  if (data.format === "html" || looksLikeHtml(data.text)) return data.text;
  return null;
}

function applyTranslationResult({
  data,
  original,
  originalHtml,
  setDisplay,
  setDisplayHtml,
  setMeta,
  setFailed,
}) {
  setMeta(data);

  if (data?.same_language) {
    setDisplay(original);
    setDisplayHtml(originalHtml || null);
    setFailed(false);
    return;
  }

  if (data?.unavailable) {
    setDisplay(original);
    setDisplayHtml(originalHtml || null);
    setFailed(true);
    return;
  }

  const translatedHtml = pickTranslatedHtml(data);
  if (translatedHtml) {
    setDisplayHtml(translatedHtml);
    setDisplay(original);
    setFailed(translatedHtml.trim() === (originalHtml || "").trim());
    return;
  }

  if (data?.text && data.text.trim() !== original.trim()) {
    setDisplayHtml(null);
    setDisplay(data.text);
    setFailed(false);
    return;
  }

  setDisplay(original);
  setDisplayHtml(originalHtml || null);
  setFailed(Boolean(data && !data.same_language));
}

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
  const mountedRef = useRef(true);

  const resolvedSourceLang = sourceLang ?? (lang === "fr" ? undefined : "fr");
  const hasSource = originalHtml.length >= 2 || original.trim().length >= 2;
  const skipTranslation = lang === "fr" && !sourceLang;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setShowOriginal(false);
    if (!enabled || !auto || !hasSource || skipTranslation) {
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

    const run = originalHtml
      ? translateRichHtml({
        html: originalHtml,
        text: original,
        targetLang: lang,
        sourceLang: resolvedSourceLang,
        entityType,
        entityId,
        field,
      })
      : translateContent({
        text: original,
        targetLang: lang,
        sourceLang: resolvedSourceLang,
        entityType,
        entityId,
        field,
      });

    run
      .then((data) => {
        if (!mountedRef.current || requestId !== requestRef.current) return;
        applyTranslationResult({
          data,
          original,
          originalHtml,
          setDisplay,
          setDisplayHtml,
          setMeta,
          setFailed,
        });
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== requestRef.current) return;
        setDisplay(original);
        setDisplayHtml(originalHtml || null);
        setFailed(true);
      })
      .finally(() => {
        if (mountedRef.current && requestId === requestRef.current) {
          setLoading(false);
        }
      });

    return () => {
      requestRef.current += 1;
    };
  }, [original, originalHtml, lang, entityType, entityId, field, auto, enabled, resolvedSourceLang, hasSource, skipTranslation]);

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
    !showOriginal
    && !loading
    && !failed
    && (htmlChanged || plainChanged)
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
