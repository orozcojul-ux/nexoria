/** Turn translated plain text into simple HTML paragraphs (fallback when HTML translation unavailable). */
export function plainTextToRichHtml(text) {
  const raw = (text || "").trim();
  if (!raw) return "";

  const escape = (value) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const blocks = raw.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length === 0) {
    return `<p>${escape(raw).replace(/\n/g, "<br>")}</p>`;
  }

  return blocks
    .map((block) => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
