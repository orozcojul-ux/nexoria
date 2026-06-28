import api from "@/lib/api";
import {
  injectHtmlSegments,
  looksLikeHtml,
  markHtmlSegments,
} from "@/lib/html-translate-client";

const TRANSLATE_TIMEOUT_MS = 25000;
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

export async function translateContent({
  text,
  html,
  targetLang,
  sourceLang,
  entityType,
  entityId,
  field,
}) {
  return postTranslate({
    text: text || "",
    html: html || undefined,
    target_lang: targetLang,
    source_lang: sourceLang,
    entity_type: entityType,
    entity_id: entityId,
    field,
  });
}

export async function translateContentBatch({ items, targetLang }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS * 2);
  try {
    const { data } = await api.post(
      "/content/translate/batch",
      { items, target_lang: targetLang },
      { signal: controller.signal, timeout: TRANSLATE_TIMEOUT_MS * 2 },
    );
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function translateSegmentsBatched(segments, {
  targetLang,
  sourceLang,
  entityType,
  entityId,
  field,
}) {
  const translated = [...segments];
  for (let offset = 0; offset < segments.length; offset += BATCH_SIZE) {
    const slice = segments.slice(offset, offset + BATCH_SIZE);
    const items = slice.map((text, index) => ({
      key: String(offset + index),
      text,
      source_lang: sourceLang,
      entity_type: entityType,
      entity_id: entityId,
      field: `${field}_seg${offset + index}`,
    }));
    const batch = await translateContentBatch({ items, targetLang });
    const results = batch?.items || {};
    for (let index = 0; index < slice.length; index += 1) {
      const key = String(offset + index);
      translated[offset + index] = results[key]?.text || slice[index];
    }
  }
  return translated;
}

/**
 * Translate rich HTML by segmenting text nodes client-side, then reassembling.
 * Falls back to server-side html translation, then plain text.
 */
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
  if (!sourceHtml) {
    return translateContent({ text, targetLang, sourceLang, entityType, entityId, field });
  }

  const cacheField = `${field || "content"}@richv2`;
  const serverTry = await postTranslate({
    text: text || "",
    html: sourceHtml,
    target_lang: targetLang,
    source_lang: sourceLang,
    entity_type: entityType,
    entity_id: entityId,
    field: cacheField,
  }).catch(() => null);

  if (
    serverTry
    && !serverTry.same_language
    && !serverTry.unavailable
    && serverTry.text
    && (serverTry.format === "html" || looksLikeHtml(serverTry.text))
  ) {
    return { ...serverTry, format: "html" };
  }

  const { markedHtml, segments } = markHtmlSegments(sourceHtml);
  if (!segments.length) {
    return translateContent({ text: text || sourceHtml, targetLang, sourceLang, entityType, entityId, field });
  }

  const translatedSegments = await translateSegmentsBatched(segments, {
    targetLang,
    sourceLang,
    entityType,
    entityId,
    field: cacheField,
  });

  return {
    text: injectHtmlSegments(markedHtml, translatedSegments),
    original: sourceHtml,
    source_lang: serverTry?.source_lang || sourceLang,
    target_lang: targetLang,
    same_language: false,
    cached: false,
    provider: "client-html",
    format: "html",
  };
}
