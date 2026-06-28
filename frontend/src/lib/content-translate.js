import api from "@/lib/api";

/** Long forum posts may require several LibreTranslate chunks server-side. */
const TRANSLATE_TIMEOUT_MS = 90000;

function translateTimeoutMs(text = "", html = "") {
  const len = Math.max((text || "").length, (html || "").length);
  if (len <= 400) return 20000;
  if (len <= 2000) return 45000;
  return TRANSLATE_TIMEOUT_MS;
}

async function postTranslate(payload) {
  const timeoutMs = translateTimeoutMs(payload.text, payload.html);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { data } = await api.post("/content/translate", payload, {
      signal: controller.signal,
      timeout: timeoutMs,
    });
    return data;
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

export async function translateContent(opts) {
  return postTranslate(buildPayload(opts));
}

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
  return postTranslate(buildPayload({
    text,
    html: sourceHtml,
    targetLang,
    sourceLang,
    entityType,
    entityId,
    field: field || "content",
  }));
}
