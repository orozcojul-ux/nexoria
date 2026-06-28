import api from "@/lib/api";
import {
  injectHtmlSegments,
  looksLikeHtml,
  markHtmlSegments,
} from "@/lib/html-translate-client";

const TRANSLATE_TIMEOUT_MS = 30000;
const BATCH_SIZE = 12;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function postTranslate(payload, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
  try {
    const { data } = await api.post("/content/translate", payload, {
      signal: controller.signal,
      timeout: TRANSLATE_TIMEOUT_MS,
    });
    return data;
  } catch (err) {
    const status = err?.response?.status;
    const timedOut = err?.code === "ECONNABORTED" || err?.name === "CanceledError" || err?.name === "AbortError";
    if ((status === 429 || status === 503 || timedOut) && attempt < 2) {
      await sleep(900 * (attempt + 1));
      return postTranslate(payload, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function buildPayload({
  text,
  html,
  targetLang,
  sourceLang,
  entityType,
  entityId,
  field,
}) {
  const payload = {
    text: text || "",
    target_lang: targetLang,
    entity_type: entityType,
    entity_id: entityId,
    field,
  };
  if (html?.trim()) payload.html = html.trim();
  if (sourceLang) payload.source_lang = sourceLang;
  return payload;
}

function isUsableTranslation(data, originalText, originalHtml) {
  if (!data || data.same_language || data.unavailable || !data.text?.trim()) return false;
  if (data.format === "html" || looksLikeHtml(data.text)) {
    return Boolean(originalHtml && data.text.trim() !== originalHtml.trim());
  }
  return data.text.trim() !== (originalText || "").trim();
}

export async function translateContent({
  text,
  html,
  targetLang,
  sourceLang,
  entityType,
  entityId,
  field,
}) {
  return postTranslate(buildPayload({
    text, html, targetLang, sourceLang, entityType, entityId, field,
  }));
}

export async function translateContentBatch({ items, targetLang }, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS * 2);
  try {
    const { data } = await api.post(
      "/content/translate/batch",
      { items, target_lang: targetLang },
      { signal: controller.signal, timeout: TRANSLATE_TIMEOUT_MS * 2 },
    );
    return data;
  } catch (err) {
    const status = err?.response?.status;
    const timedOut = err?.code === "ECONNABORTED" || err?.name === "CanceledError" || err?.name === "AbortError";
    if ((status === 429 || status === 503 || timedOut) && attempt < 2) {
      await sleep(900 * (attempt + 1));
      return translateContentBatch({ items, targetLang }, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function translateSegmentsClient(segments, opts) {
  const {
    targetLang, sourceLang, entityType, entityId, field,
  } = opts;
  const translated = [...segments];
  for (let offset = 0; offset < segments.length; offset += BATCH_SIZE) {
    const slice = segments.slice(offset, offset + BATCH_SIZE);
    const items = slice.map((seg, index) => ({
      key: String(offset + index),
      text: seg,
      source_lang: sourceLang,
      entity_type: entityType,
      entity_id: entityId,
      field: `${field}_cseg${offset + index}`,
    }));
    const batch = await translateContentBatch({ items, targetLang });
    const results = batch?.items || {};
    for (let index = 0; index < slice.length; index += 1) {
      const key = String(offset + index);
      const item = results[key];
      if (item?.text && !item.unavailable && !item.same_language) {
        translated[offset + index] = item.text;
      }
    }
  }
  return translated;
}

/** Translate rich HTML — server first, client segment fallback if needed. */
export async function translateRichHtml({
  html,
  text,
  targetLang,
  sourceLang,
  entityType,
  entityId,
  field,
}) {
  const sourceHtml = (html || "").trim();
  const cacheField = `${field || "content"}@richv4`;

  if (!sourceHtml) {
    return translateContent({ text, targetLang, sourceLang, entityType, entityId, field });
  }

  let serverResult = null;
  try {
    serverResult = await postTranslate(buildPayload({
      text,
      html: sourceHtml,
      targetLang,
      sourceLang,
      entityType,
      entityId,
      field: cacheField,
    }));
    if (isUsableTranslation(serverResult, text, sourceHtml)) {
      return {
        ...serverResult,
        format: serverResult.format || (looksLikeHtml(serverResult.text) ? "html" : "plain"),
      };
    }
  } catch {
    /* client fallback below */
  }

  const { markedHtml, segments } = markHtmlSegments(sourceHtml);
  if (!segments.length) {
    return translateContent({ text: text || sourceHtml, targetLang, sourceLang, entityType, entityId, field });
  }

  try {
    const translatedSegments = await translateSegmentsClient(segments, {
      targetLang,
      sourceLang,
      entityType,
      entityId,
      field: cacheField,
    });
    const injected = injectHtmlSegments(markedHtml, translatedSegments);
    if (injected.trim() !== sourceHtml.trim()) {
      return {
        text: injected,
        original: sourceHtml,
        source_lang: sourceLang || serverResult?.source_lang,
        target_lang: targetLang,
        same_language: false,
        cached: false,
        provider: "client-html",
        format: "html",
      };
    }
  } catch {
    /* plain fallback below */
  }

  const plainFallback = await translateContent({
    text: text || sourceHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    targetLang,
    sourceLang,
    entityType,
    entityId,
    field,
  });
  if (plainFallback?.text && !plainFallback.unavailable && !plainFallback.same_language) {
    return { ...plainFallback, format: "plain" };
  }

  return serverResult || plainFallback || {
    text: sourceHtml,
    original: sourceHtml,
    source_lang: sourceLang || "fr",
    target_lang: targetLang,
    same_language: false,
    unavailable: true,
    provider: "none",
    format: "html",
  };
}
