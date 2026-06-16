/** Extrait le texte lisible d'un fragment HTML (pour affichage propre). */
export function stripHtml(html, { preserveBreaks = false } = {}) {
  if (!html || typeof html !== "string") return "";
  let raw = html.replace(/<br\s*\/?>/gi, "\n");
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const text = doc.body.textContent || "";
    if (preserveBreaks) {
      return text
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .filter(Boolean)
        .join("\n");
    }
    return text.replace(/\s+/g, " ").trim();
  }
  const stripped = raw.replace(/<[^>]+>/g, preserveBreaks ? "" : " ");
  if (preserveBreaks) {
    return stripped
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .filter(Boolean)
      .join("\n");
  }
  return stripped.replace(/\s+/g, " ").trim();
}
