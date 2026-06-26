/**
 * Safe i18n helpers — sanitize vars, normalize placeholders, hide broken output.
 */

const PLACEHOLDER_RE = /(\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}|\{[a-zA-Z_][a-zA-Z0-9_]*\}|\([a-zA-Z_][a-zA-Z0-9_]*\))/g;
const KEY_LIKE_RE = /^[a-z][a-z0-9_.-]*\.[a-z0-9_.-]+$/i;

/** Convert legacy `{var}` to i18next `{{var}}` without touching existing `{{var}}`. */
export function normalizeI18nPlaceholders(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(/(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, "{{$1}}");
}

/** Coerce interpolation vars to safe display values. */
export function sanitizeI18nVars(vars = {}) {
  const out = {};
  for (const [key, raw] of Object.entries(vars)) {
    if (raw === null || raw === undefined) {
      if (/count|n|num|qty|amount|level|hours|minutes|days|weeks/i.test(key)) {
        out[key] = 0;
      } else {
        out[key] = "—";
      }
      continue;
    }
    if (typeof raw === "number") {
      out[key] = Number.isFinite(raw) ? raw : 0;
      continue;
    }
    if (typeof raw === "object") {
      out[key] = "—";
      continue;
    }
    out[key] = String(raw);
  }
  return out;
}

/** Replace {{var}} and {var} placeholders (post-i18next safety net). */
export function applyI18nPlaceholders(text, vars = {}) {
  if (!text || typeof text !== "string") return text || "";
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    const val = String(v ?? "");
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), val);
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), val);
    out = out.replace(new RegExp(`\\(${k}\\)`, "g"), val);
  }
  return out;
}

export function hasVisiblePlaceholders(text) {
  return PLACEHOLDER_RE.test(text || "");
}

export function looksLikeMissingKey(result, key) {
  if (!result || result === key) return true;
  if (KEY_LIKE_RE.test(result)) return true;
  return hasVisiblePlaceholders(result);
}

export function finalizeTranslation(text, vars, key) {
  const safeVars = sanitizeI18nVars(vars);
  let out = normalizeI18nPlaceholders(text);
  out = applyI18nPlaceholders(out, safeVars);
  if (hasVisiblePlaceholders(out)) {
    out = applyI18nPlaceholders(out, {
      ...safeVars,
      count: safeVars.count ?? safeVars.n ?? 0,
      n: safeVars.n ?? safeVars.count ?? 0,
    });
  }
  if (looksLikeMissingKey(out, key)) {
    return process.env.NODE_ENV === "development" ? key : "—";
  }
  if (/\b(undefined|null)\b/i.test(out)) {
    return "—";
  }
  return out;
}
