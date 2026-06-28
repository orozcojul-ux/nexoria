const MARKER = "data-nx-tx";

/** Split HTML into structure + text segments (browser DOM). */
export function markHtmlSegments(rawHtml) {
  const html = (rawHtml || "").trim();
  if (!html || typeof DOMParser === "undefined") {
    return { markedHtml: html, segments: [] };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const segments = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const toReplace = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const value = node.nodeValue ?? "";
    if (!value.trim()) continue;
    toReplace.push({ node, value });
  }

  for (const { node, value } of toReplace) {
    const id = segments.length;
    segments.push(value);
    const span = doc.createElement("span");
    span.setAttribute(MARKER, String(id));
    span.textContent = value;
    node.parentNode?.replaceChild(span, node);
  }

  return { markedHtml: doc.body.innerHTML, segments };
}

/** Inject translated segments back into marked HTML. */
export function injectHtmlSegments(markedHtml, translatedSegments) {
  const html = (markedHtml || "").trim();
  if (!html || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.body.querySelectorAll(`[${MARKER}]`).forEach((el) => {
    const id = Number.parseInt(el.getAttribute(MARKER) || "", 10);
    const text = Number.isFinite(id) && id >= 0 && id < translatedSegments.length
      ? translatedSegments[id]
      : el.textContent;
    el.replaceWith(doc.createTextNode(text ?? ""));
  });

  return doc.body.innerHTML;
}

export function looksLikeHtml(value) {
  return /<(?:p|br|div|strong|b|em|i|u|mark|ul|ol|li|h[1-6]|blockquote|span)\b/i.test(value || "");
}
