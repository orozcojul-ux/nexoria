/** Country codes aligned with backend/discord_international.py COUNTRY_SPECS */
export const COUNTRIES = [
  { code: "fr", flagCode: "fr", flag: "🇫🇷" },
  { code: "be", flagCode: "be", flag: "🇧🇪" },
  { code: "ch", flagCode: "ch", flag: "🇨🇭" },
  { code: "ca", flagCode: "ca", flag: "🇨🇦" },
  { code: "us", flagCode: "us", flag: "🇺🇸" },
  { code: "uk", flagCode: "gb", flag: "🇬🇧" },
  { code: "es", flagCode: "es", flag: "🇪🇸" },
  { code: "de", flagCode: "de", flag: "🇩🇪" },
  { code: "it", flagCode: "it", flag: "🇮🇹" },
  { code: "br", flagCode: "br", flag: "🇧🇷" },
  { code: "nl", flagCode: "nl", flag: "🇳🇱" },
  { code: "jp", flagCode: "jp", flag: "🇯🇵" },
  { code: "other", flagCode: null, flag: "🌍" },
];

export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

export function countryFlagCode(code) {
  return COUNTRY_BY_CODE[code]?.flagCode ?? null;
}

export function countryFlagEmoji(code) {
  return COUNTRY_BY_CODE[code]?.flag ?? null;
}
