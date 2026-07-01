"""Règles locales multilingues de modération Naria — sans API externe."""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

from naria_language import detect_content_language, normalize_lang

RULE_SCORES = {
    "spam_light": 1,
    "duplicate": 1,
    "caps_abuse": 1,
    "suspicious_link": 2,
    "insult": 2,
    "filter_evasion": 3,
    "hate_threat": 5,
    "excessive_length": 1,
    "excessive_emoji": 1,
    "external_discord": 2,
    "harassment": 3,
}

RULE_CONFIDENCE = {
    "hate_threat": 0.95,
    "bad_word": 0.88,
    "filter_evasion": 0.78,
    "harassment": 0.82,
    "suspicious_link": 0.72,
    "external_discord": 0.65,
    "duplicate": 0.62,
    "spam_light": 0.48,
    "caps_abuse": 0.42,
    "excessive_emoji": 0.38,
    "excessive_length": 0.35,
}

PREVIEW_MAX = 300

# Mots prudents par langue — listes courtes pour limiter les faux positifs
FORBIDDEN_WORDS_BY_LANGUAGE: dict[str, frozenset[str]] = {
    "fr": frozenset({"connard", "connasse", "salope", "enculé", "encule", "fdp", "ntm", "pute", "pd", "pédé"}),
    "en": frozenset({"fuck", "shit", "bitch", "asshole", "bastard", "cunt", "nigger", "nigga", "faggot"}),
    "es": frozenset({"puta", "mierda", "cabron", "cabrón", "maricon", "maricón", "gilipollas"}),
    "de": frozenset({"scheisse", "scheiße", "fotze", "hurensohn", "wichser", "arschloch"}),
    "it": frozenset({"cazzo", "merda", "stronzo", "puttana", "vaffanculo"}),
    "pt": frozenset({"porra", "caralho", "puta", "merda", "fdp", "viado"}),
    "nl": frozenset({"kanker", "tyfus", "kut", "lul", "hoer"}),
    "ja": frozenset(),  # patterns séparés
}

# Mots universels (toutes langues)
UNIVERSAL_BAD_WORDS = frozenset({"nigger", "nigga", "hitler", "nazi"})

HARASSMENT_PATTERNS_BY_LANGUAGE: dict[str, list[re.Pattern]] = {
    "fr": [
        re.compile(r"\b(tu\s+vas\s+mourir|je\s+te\s+tue|crève|suicide)\b", re.I),
        re.compile(r"\b(mort\s+aux|haine\s+envers)\b", re.I),
    ],
    "en": [
        re.compile(r"\b(i\s+will\s+kill\s+you|go\s+die|kill\s+yourself|kys)\b", re.I),
        re.compile(r"\b(death\s+to|hate\s+all)\b", re.I),
    ],
    "es": [
        re.compile(r"\b(te\s+voy\s+a\s+matar|muérete|suicidate)\b", re.I),
    ],
    "de": [
        re.compile(r"\b(ich\s+töte\s+dich|bring\s+dich\s+um|stirb)\b", re.I),
    ],
    "it": [
        re.compile(r"\b(ti\s+uccido|muori|suicidati)\b", re.I),
    ],
    "pt": [
        re.compile(r"\b(vou\s+te\s+matar|morre|se\s+mata)\b", re.I),
    ],
    "nl": [
        re.compile(r"\b(ik\s+vermoord\s+je|dood\s+jou|sterven)\b", re.I),
    ],
    "ja": [
        re.compile(r"(死ね|殺す|自殺)", re.I),
    ],
}

DISCORD_INVITE = re.compile(
    r"(discord\.gg/|discord\.com/invite/|discordapp\.com/invite/)",
    re.I,
)
SUSPICIOUS_LINK = re.compile(r"https?://[^\s]+|www\.[^\s]+", re.I)
SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly",
    "rebrand.ly", "shorturl.at",
}
EVASION_MAP = str.maketrans({
    "@": "a", "4": "a", "3": "e", "1": "i", "!": "i", "0": "o", "$": "s", "5": "s",
})


@dataclass
class RuleHit:
    rule: str
    score: int
    severity: str
    reason: str
    confidence: float = 0.5
    reason_code: str = "other"


@dataclass
class AnalysisResult:
    hits: list[RuleHit] = field(default_factory=list)
    normalized: str = ""
    total_score: int = 0
    max_severity: str = "low"
    confidence: float = 0.0
    detected_language: str = "fr"
    primary_reason_code: str = "none"
    allowed: bool = True

    @property
    def primary_reason(self) -> str:
        if not self.hits:
            return ""
        return self.hits[0].reason


def normalize_text(text: str) -> str:
    raw = unicodedata.normalize("NFKC", (text or ""))
    return re.sub(r"\s+", " ", raw.strip())


def _deobfuscate(text: str) -> str:
    lowered = text.lower().translate(EVASION_MAP)
    return re.sub(r"[^a-z0-9\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]", "", lowered)


def _caps_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if len(letters) < 8:
        return 0.0
    return sum(1 for c in letters if c.isupper()) / len(letters)


def _emoji_count(text: str) -> int:
    return len(re.findall(
        r"[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F600-\U0001F64F]",
        text,
    ))


def _word_boundary_match(word: str, text: str, deob: str) -> bool:
    """Évite les faux positifs sur sous-chaînes (ex. « analyst »)."""
    if len(word) < 3:
        return word in text or word in deob
    pat = re.compile(rf"(?<![a-zàâäéèêëïîôùûüœæç0-9]){re.escape(word)}(?![a-zàâäéèêëïîôùûüœæç0-9])", re.I)
    return bool(pat.search(text)) or word in deob


def _check_forbidden_words(text: str, lang: str) -> list[RuleHit]:
    hits: list[RuleHit] = []
    lowered = text.lower()
    deob = _deobfuscate(text)
    langs_to_check = [lang, "en", "fr"] if lang not in ("en", "fr") else [lang, "en" if lang == "fr" else "fr"]
    seen: set[str] = set()

    for check_lang in langs_to_check:
        words = FORBIDDEN_WORDS_BY_LANGUAGE.get(check_lang, frozenset()) | UNIVERSAL_BAD_WORDS
        for word in words:
            if word in seen:
                continue
            if _word_boundary_match(word, lowered, deob):
                seen.add(word)
                critical = word in UNIVERSAL_BAD_WORDS
                rule = "hate_threat" if critical else "bad_word"
                sev = "critical" if critical else "high"
                conf = RULE_CONFIDENCE.get(rule, 0.85)
                if word in deob and word not in lowered:
                    rule = "filter_evasion"
                    conf = RULE_CONFIDENCE["filter_evasion"]
                hits.append(RuleHit(
                    rule=rule,
                    score=RULE_SCORES.get("hate_threat" if critical else "insult", 2),
                    severity=sev,
                    reason=f"Langage inapproprié ({check_lang})",
                    confidence=conf,
                    reason_code="hate" if critical else "insult",
                ))

    return hits


def _check_harassment(text: str, lang: str) -> list[RuleHit]:
    hits: list[RuleHit] = []
    patterns = HARASSMENT_PATTERNS_BY_LANGUAGE.get(lang, [])
    patterns += HARASSMENT_PATTERNS_BY_LANGUAGE.get("en", [])
    for pat in patterns:
        if pat.search(text):
            hits.append(RuleHit(
                rule="hate_threat",
                score=RULE_SCORES["hate_threat"],
                severity="critical",
                reason="Menace ou harcèlement",
                confidence=RULE_CONFIDENCE["hate_threat"],
                reason_code="threat",
            ))
            break
    return hits


def analyze_content(
    text: str,
    *,
    is_duplicate: bool = False,
    max_length: int | None = None,
    user_language: str = "fr",
    content_language: str | None = None,
) -> AnalysisResult:
    normalized = normalize_text(text)
    if not normalized:
        return AnalysisResult(hits=[], normalized="", allowed=True)

    fallback = normalize_lang(user_language)
    detected = normalize_lang(content_language) if content_language else detect_content_language(normalized, fallback)
    hits: list[RuleHit] = []

    if len(normalized) > (max_length or 8000):
        hits.append(RuleHit(
            rule="excessive_length", score=RULE_SCORES["excessive_length"],
            severity="low", reason="Contenu excessivement long",
            confidence=RULE_CONFIDENCE["excessive_length"], reason_code="spam",
        ))

    if is_duplicate:
        hits.append(RuleHit(
            rule="duplicate", score=RULE_SCORES["duplicate"],
            severity="low", reason="Message répété",
            confidence=RULE_CONFIDENCE["duplicate"], reason_code="repeated_message",
        ))

    caps = _caps_ratio(normalized)
    if caps >= 0.7 and len(normalized) >= 12:
        hits.append(RuleHit(
            rule="caps_abuse", score=RULE_SCORES["caps_abuse"],
            severity="low", reason="Abus de majuscules",
            confidence=RULE_CONFIDENCE["caps_abuse"], reason_code="caps_abuse",
        ))

    emojis = _emoji_count(normalized)
    if emojis >= 15:
        hits.append(RuleHit(
            rule="excessive_emoji", score=RULE_SCORES["excessive_emoji"],
            severity="low", reason="Emojis excessifs",
            confidence=RULE_CONFIDENCE["excessive_emoji"], reason_code="spam",
        ))

    if re.search(r"(.)\1{6,}", normalized):
        hits.append(RuleHit(
            rule="spam_light", score=RULE_SCORES["spam_light"],
            severity="low", reason="Répétition de caractères",
            confidence=RULE_CONFIDENCE["spam_light"], reason_code="spam",
        ))

    words = normalized.lower().split()
    if len(words) >= 4:
        unique_ratio = len(set(words)) / len(words)
        if unique_ratio < 0.35:
            hits.append(RuleHit(
                rule="spam_light", score=RULE_SCORES["spam_light"],
                severity="medium", reason="Contenu répétitif",
                confidence=min(0.55, RULE_CONFIDENCE["spam_light"] + 0.1), reason_code="spam",
            ))

    hits.extend(_check_forbidden_words(normalized, detected))
    hits.extend(_check_harassment(normalized, detected))

    if DISCORD_INVITE.search(normalized):
        hits.append(RuleHit(
            rule="external_discord", score=RULE_SCORES["external_discord"],
            severity="medium", reason="Invitation Discord externe",
            confidence=RULE_CONFIDENCE["external_discord"], reason_code="suspicious_link",
        ))

    for match in SUSPICIOUS_LINK.finditer(normalized):
        url = match.group(0).lower()
        if any(d in url for d in SHORTENER_DOMAINS):
            hits.append(RuleHit(
                rule="suspicious_link", score=RULE_SCORES["suspicious_link"],
                severity="medium", reason="Lien raccourci suspect",
                confidence=RULE_CONFIDENCE["suspicious_link"], reason_code="suspicious_link",
            ))
            break

    severity_rank = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    total = sum(h.score for h in hits)
    max_sev = "low"
    max_conf = 0.0
    primary_code = "none"
    for h in hits:
        if severity_rank.get(h.severity, 0) > severity_rank.get(max_sev, 0):
            max_sev = h.severity
        max_conf = max(max_conf, h.confidence)
        if h.reason_code != "other":
            primary_code = h.reason_code

    return AnalysisResult(
        hits=hits,
        normalized=normalized,
        total_score=total,
        max_severity=max_sev if hits else "low",
        confidence=max_conf,
        detected_language=detected,
        primary_reason_code=primary_code,
        allowed=len(hits) == 0,
    )


def preview_text(text: str, limit: int = PREVIEW_MAX) -> str:
    clean = normalize_text(text)
    if len(clean) <= limit:
        return clean
    return clean[: limit - 1] + "…"
