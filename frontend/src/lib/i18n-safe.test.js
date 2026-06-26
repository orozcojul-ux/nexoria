import {
  normalizeI18nPlaceholders,
  sanitizeI18nVars,
  applyI18nPlaceholders,
  finalizeTranslation,
} from "./i18n-safe";

describe("i18n-safe", () => {
  test("normalizes single-brace placeholders", () => {
    expect(normalizeI18nPlaceholders("{count} tours")).toBe("{{count}} tours");
    expect(normalizeI18nPlaceholders("{{count}} tours")).toBe("{{count}} tours");
  });

  test("sanitizes missing count as zero", () => {
    expect(sanitizeI18nVars({ count: undefined }).count).toBe(0);
  });

  test("applyI18nPlaceholders replaces double braces", () => {
    expect(applyI18nPlaceholders("Il y a {{count}} h", { count: 3 })).toBe("Il y a 3 h");
  });

  test("finalizeTranslation fixes broken maintenance-style string", () => {
    const out = finalizeTranslation("Il y a {{count}} h", { count: 2 }, "time.hoursAgo");
    expect(out).toBe("Il y a 2 h");
    expect(out).not.toMatch(/\{\{/);
  });
});
