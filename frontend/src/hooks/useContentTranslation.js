import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { translateContent } from "@/lib/content-translate";
import { useI18n } from "@/i18n/LanguageProvider";

/**
 * Auto-translate user-generated content into the viewer's UI language.
 */
export function useContentTranslation(
  text,
  {
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
  const [display, setDisplay] = useState(original);
  const [showOriginal, setShowOriginal] = useState(false);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);

  const resolvedSourceLang = sourceLang ?? (lang === "fr" ? undefined : "fr");

  useEffect(() => {
    setShowOriginal(false);
    if (!enabled || !auto || original.trim().length < 2) {
      setDisplay(original);
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
        } else {
          setDisplay(data?.text || original);
        }
        setFailed(false);
      })
      .catch(() => {
        if (requestId !== requestRef.current) return;
        setDisplay(original);
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
  }, [original, lang, entityType, entityId, field, auto, enabled, resolvedSourceLang]);

  const toggleOriginal = useCallback(() => {
    setShowOriginal((v) => !v);
  }, []);

  const visible = showOriginal ? original : display;
  const isTranslated = Boolean(
    meta && !meta.same_language && !meta.unavailable && !showOriginal && display !== original,
  );

  return useMemo(
    () => ({
      visible,
      original,
      display,
      showOriginal,
      toggleOriginal,
      isTranslated,
      loading,
      failed,
      meta,
    }),
    [visible, original, display, showOriginal, toggleOriginal, isTranslated, loading, failed, meta],
  );
}
