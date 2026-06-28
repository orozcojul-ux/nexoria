import api from "@/lib/api";

const TRANSLATE_TIMEOUT_MS = 25000;
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
