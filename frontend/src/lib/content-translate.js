import api from "@/lib/api";

export async function translateContent({
  text,
  targetLang,
  sourceLang,
  entityType,
  entityId,
  field,
}) {
  const { data } = await api.post("/content/translate", {
    text,
    target_lang: targetLang,
    source_lang: sourceLang,
    entity_type: entityType,
    entity_id: entityId,
    field,
  });
  return data;
}

export async function translateContentBatch({ items, targetLang }) {
  const { data } = await api.post("/content/translate/batch", {
    items,
    target_lang: targetLang,
  });
  return data;
}
