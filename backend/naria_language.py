"""Langue utilisateur et détection de langue du contenu — Naria."""
from __future__ import annotations

import re

SUPPORTED_LANGS = frozenset({"fr", "en", "es", "de", "it", "pt", "nl", "ja"})
DEFAULT_LANG = "fr"

# Mots fréquents par langue (détection heuristique)
_LANG_MARKERS: dict[str, frozenset[str]] = {
    "fr": frozenset({
        "le", "la", "les", "de", "des", "un", "une", "et", "est", "je", "tu", "vous",
        "nous", "pas", "pour", "dans", "sur", "avec", "que", "qui", "bonjour", "merci",
        "salut", "comment", "ça", "cette", "mon", "ton", "son", "être", "avoir",
    }),
    "en": frozenset({
        "the", "and", "is", "are", "you", "your", "this", "that", "with", "for",
        "hello", "thanks", "please", "what", "how", "have", "from", "not", "was",
        "were", "they", "their", "about", "just", "like", "good", "game",
    }),
    "es": frozenset({
        "el", "la", "los", "las", "de", "que", "y", "en", "un", "una", "es", "por",
        "con", "hola", "gracias", "como", "está", "estoy", "para", "muy", "bien",
    }),
    "de": frozenset({
        "der", "die", "das", "und", "ist", "nicht", "ein", "eine", "ich", "du",
        "wir", "ihr", "mit", "für", "auf", "hallo", "danke", "bitte", "auch",
    }),
    "it": frozenset({
        "il", "lo", "la", "i", "gli", "le", "di", "che", "non", "per", "con",
        "ciao", "grazie", "come", "sono", "questo", "molto", "bene", "una",
    }),
    "pt": frozenset({
        "o", "a", "os", "as", "de", "que", "não", "um", "uma", "com", "para",
        "olá", "obrigado", "obrigada", "como", "está", "muito", "bem", "você",
    }),
    "nl": frozenset({
        "de", "het", "een", "en", "van", "is", "niet", "dat", "met", "voor",
        "hallo", "dank", "bedankt", "hoe", "goed", "zijn", "ook", "maar",
    }),
}

_JA_RE = re.compile(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]")
_FR_ACCENTS = re.compile(r"[àâäéèêëïîôùûüœæç]", re.I)


def normalize_lang(code: str | None) -> str:
    if not code:
        return DEFAULT_LANG
    c = str(code).strip().lower().replace("_", "-")
    if c.startswith("pt"):
        return "pt"
    if c in SUPPORTED_LANGS:
        return c
    base = c.split("-")[0]
    return base if base in SUPPORTED_LANGS else DEFAULT_LANG


def resolve_user_language(
    user: dict | None,
    *,
    accept_language: str | None = None,
) -> str:
    """Priorité : compte → Accept-Language → fr."""
    if user and user.get("language"):
        return normalize_lang(user["language"])
    if accept_language:
        for part in accept_language.split(","):
            token = part.split(";")[0].strip()
            if token:
                lang = normalize_lang(token)
                if lang in SUPPORTED_LANGS:
                    return lang
    return DEFAULT_LANG


def detect_content_language(text: str, fallback: str = DEFAULT_LANG) -> str:
    """Détection heuristique sans API externe."""
    if not text or not text.strip():
        return normalize_lang(fallback)

    sample = text.strip()
    lowered = sample.lower()
    tokens = re.findall(r"[a-zàâäéèêëïîôùûüœæçA-Z]+", lowered)
    if not tokens:
        if _JA_RE.search(sample):
            return "ja"
        return normalize_lang(fallback)

    if _JA_RE.search(sample):
        ja_chars = len(_JA_RE.findall(sample))
        if ja_chars >= max(3, len(sample) // 8):
            return "ja"

    scores: dict[str, int] = {lang: 0 for lang in _LANG_MARKERS}
    for tok in tokens:
        for lang, markers in _LANG_MARKERS.items():
            if tok in markers:
                scores[lang] += 1

    if _FR_ACCENTS.search(sample):
        scores["fr"] += 2

    best_lang = max(scores, key=scores.get)
    if scores[best_lang] >= 2:
        return best_lang

    return normalize_lang(fallback)
