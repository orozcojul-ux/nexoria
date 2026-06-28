import api from "@/lib/api";

const TRANSLATE_TIMEOUT_MS = 15000;

async function postTranslate(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
  try {
    const { data } = await api.post("/content/translate", payload, {
      signal: controller.signal,
      timeout: TRANSLATE_TIMEOUT_MS,
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
