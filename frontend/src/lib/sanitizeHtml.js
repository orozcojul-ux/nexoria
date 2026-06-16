const FORBIDDEN_TAGS = new Set(["script", "iframe", "object", "embed", "form", "link", "meta", "style", "svg"]);

const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,/i;
const SAFE_SRC = (value) => {
  const v = (value || "").trim();
  if (!v) return false;
  if (v.startsWith("javascript:") || v.startsWith("vbscript:")) return false;
  if (v.startsWith("data:")) return SAFE_DATA_IMAGE.test(v);
  return v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/uploads/");
};

/** Nettoie le HTML admin avant affichage public. */
export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";
  if (typeof DOMParser === "undefined") {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (FORBIDDEN_TAGS.has(tag)) {
      el.remove();
      return;
    }
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value || "";
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        return;
      }
      if (name === "src" && !SAFE_SRC(value)) el.removeAttribute(attr.name);
      if (name === "href" && !SAFE_SRC(value) && !value.startsWith("#") && !value.startsWith("mailto:")) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}
