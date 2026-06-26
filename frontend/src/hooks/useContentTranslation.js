import { useCallback, useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    setShowOriginal(false);
    if (!enabled || !auto || original.trim().length < 2) {
      setDisplay(original);
      setMeta(null);
      setFailed(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    translateContent({
      text: original,
      targetLang: lang,
      sourceLang,
      entityType,
      entityId,
      field,
    })
      .then((data) => {
        if (cancelled) return;
        setMeta(data);
        if (data?.same_language || data?.unavailable) {
          setDisplay(original);
        } else {
          setDisplay(data?.text || original);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplay(original);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [original, lang, entityType, entityId, field, auto, enabled, sourceLang]);

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
