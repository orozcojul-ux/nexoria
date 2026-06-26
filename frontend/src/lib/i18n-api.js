/**
 * Translate API error payloads without exposing raw keys to users.
 */
export function translateApiError(t, err, fallbackKey = "errors.generic") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (detail && typeof detail === "object" && detail.message) {
    return String(detail.message);
  }
  return t(fallbackKey);
}
