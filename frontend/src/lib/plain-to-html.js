/** Turn translated plain text into simple HTML paragraphs (fallback when HTML translation unavailable). */
import { looksLikeHtml } from "@/lib/html-translate-client";

export { looksLikeHtml };

export function plainTextToRichHtml(text) {
  const raw = (text || "").trim();
  if (!raw) return "";

  const escape = (value) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const lines = raw.split(/\n/);
  const hasBullets = lines.some((line) => /^[\s]*[-•–—]\s+/.test(line));
  if (hasBullets) {
    const parts = [];
    let listItems = [];
    const flushList = () => {
      if (listItems.length) {
        parts.push(`<ul>${listItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>`);
        listItems = [];
      }
    };
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        continue;
      }
      const bullet = trimmed.match(/^[-•–—]\s+(.+)$/);
      if (bullet) {
        listItems.push(bullet[1]);
      } else {
        flushList();
        parts.push(`<p>${escape(trimmed)}</p>`);
      }
    }
    flushList();
    if (parts.length) return parts.join("");
  }

  const blocks = raw.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length === 0) {
    return `<p>${escape(raw).replace(/\n/g, "<br>")}</p>`;
  }

  return blocks
    .map((block) => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Ensure we always have HTML to preserve structure when only plain is stored. */
export function resolveSourceHtml(html, plain) {
  const rich = (html || "").trim();
  if (rich && looksLikeHtml(rich)) return rich;
  const text = (plain || "").trim();
  if (!text) return rich;
  if (rich) return rich;
  return plainTextToRichHtml(text);
}
