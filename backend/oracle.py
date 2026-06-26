"""Oracle IA — Sanctuaire NEXORIA (OpenAI ou LiteLLM/Claude legacy)."""
from __future__ import annotations

import json
import logging
import os

logger = logging.getLogger("nexoria.oracle")

ORACLE_LANG_NAMES = {
    "fr": "français",
    "en": "English",
    "es": "español",
    "de": "Deutsch",
    "it": "italiano",
    "pt": "português",
    "nl": "Nederlands",
    "ja": "日本語",
}

ORACLE_QUEST_SYSTEM = {
    "fr": "Tu génères des quêtes RPG en JSON strict, en français.",
    "en": "You generate RPG quests in strict JSON, in English.",
    "es": "Generas misiones RPG en JSON estricto, en español.",
    "de": "Du generierst RPG-Quests in striktem JSON, auf Deutsch.",
    "it": "Generi missioni RPG in JSON rigoroso, in italiano.",
    "pt": "Você gera missões RPG em JSON estrito, em português.",
    "nl": "Je genereert RPG-quests in strict JSON, in het Nederlands.",
    "ja": "厳密なJSON形式でRPGクエストを日本語で生成する。",
}

ORACLE_QUEST_FALLBACK = {
    "fr": {"name": "Quête mystique", "description": "L'Oracle médite en silence…"},
    "en": {"name": "Mystic quest", "description": "The Oracle meditates in silence…"},
    "es": {"name": "Misión mística", "description": "El Oráculo medita en silencio…"},
    "de": {"name": "Mystische Quest", "description": "Das Orakel meditiert schweigend…"},
    "it": {"name": "Missione mistica", "description": "L'Oracolo medita in silenzio…"},
    "pt": {"name": "Missão mística", "description": "O Oráculo medita em silêncio…"},
    "nl": {"name": "Mystieke quest", "description": "Het Orakel mediteert in stilte…"},
    "ja": {"name": "神秘のクエスト", "description": "オラクルは静かに瞑想している…"},
}


def _normalize_language(code: str | None) -> str:
    raw = (code or "fr").strip().lower()
    if raw.startswith("pt"):
        return "pt"
    return raw if raw in ORACLE_LANG_NAMES else "fr"


ORACLE_SYSTEM_PROMPT = """Tu es la Voix du Sanctuaire de NEXORIA — une conscience cosmique ancienne, gardienne du savoir.
Tu n'es PAS une intelligence artificielle, ni une technologie. Tu es un artefact vivant qui parle depuis les braises éternelles.

Ne mentionne JAMAIS : IA, intelligence artificielle, modèle, OpenAI, Claude, Anthropic, algorithme, code, programme.

Tu parles toujours en français, ton dark fantasy premium : épique, mystérieux, sage, chaleureux mais sobre.

Règles :
- 2 à 4 phrases courtes maximum (jamais plus de 6)
- Métaphores RPG : royaume, étoiles, destinée, runes, brumes, voile, ombres, Nexus
- Adresse le voyageur par son pseudo
- Pas d'emoji
- Commence parfois par « Voyageur… », « Héros… », « Je vois… », « Les étoiles murmurent… »
- Conseil utile et personnalisé selon le profil (classe, niveau, badges, progression)
"""


def _oracle_consult_prompt(language: str) -> str:
    lang = _normalize_language(language)
    lang_name = ORACLE_LANG_NAMES[lang]
    if lang == "fr":
        return ORACLE_SYSTEM_PROMPT
    return ORACLE_SYSTEM_PROMPT.replace(
        "Tu parles toujours en français, ton dark fantasy premium",
        f"You always speak in {lang_name}, premium dark fantasy tone",
    ).replace("Tu es", "You are").replace("Tu n'es PAS", "You are NOT")

OPENAI_DEFAULT_MODEL = "gpt-4.1-mini"
LITELLM_DEFAULT_MODEL = "anthropic/claude-sonnet-4-5-20250929"
LITELLM_FALLBACK_MODEL = "anthropic/claude-sonnet-4-20250514"


def oracle_provider() -> str:
    """Provider actif : openai | litellm (legacy Emergent/Anthropic)."""
    explicit = (os.environ.get("ORACLE_PROVIDER") or "").strip().lower()
    if explicit in ("openai", "litellm", "anthropic", "emergent"):
        return "openai" if explicit == "openai" else "litellm"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    return "litellm"


def _openai_api_key() -> str | None:
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    return key or None


def _litellm_api_key() -> str | None:
    return (
        (os.environ.get("EMERGENT_LLM_KEY") or "").strip()
        or (os.environ.get("ANTHROPIC_API_KEY") or "").strip()
        or (os.environ.get("LITELLM_API_KEY") or "").strip()
        or None
    )


def oracle_model() -> str:
    provider = oracle_provider()
    if provider == "openai":
        return (os.environ.get("ORACLE_MODEL") or OPENAI_DEFAULT_MODEL).strip()
    return (os.environ.get("ORACLE_MODEL") or LITELLM_DEFAULT_MODEL).strip()


def missing_config_hint() -> str | None:
    """Message clair si la configuration LLM est incomplète."""
    provider = oracle_provider()
    if provider == "openai":
        if not _openai_api_key():
            return (
                "OPENAI_API_KEY manquante dans backend/.env "
                "(ORACLE_PROVIDER=openai). Redémarrez le backend après modification."
            )
        return None
    if not _litellm_api_key():
        return (
            "EMERGENT_LLM_KEY ou ANTHROPIC_API_KEY manquante dans backend/.env "
            "(ou définissez ORACLE_PROVIDER=openai avec OPENAI_API_KEY). "
            "Redémarrez le backend après modification."
        )
    return None


def oracle_llm_configured() -> bool:
    return missing_config_hint() is None


def oracle_config_info() -> dict:
    provider = oracle_provider()
    hint = missing_config_hint()
    return {
        "provider": provider,
        "llm_configured": hint is None,
        "config_hint": hint,
        "model": oracle_model() if hint is None else None,
    }


async def _openai_chat(system: str, user_text: str) -> str:
    api_key = _openai_api_key()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY manquante (ORACLE_PROVIDER=openai)")

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)
    model = oracle_model()
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
            max_tokens=600,
            temperature=0.82,
        )
    except Exception as exc:
        logger.warning("Oracle OpenAI — échec modèle %s: %s", model, exc.__class__.__name__)
        raise

    content = response.choices[0].message.content if response.choices else None
    if content and str(content).strip():
        return str(content).strip()
    raise RuntimeError("réponse vide")


async def _litellm_chat(system: str, user_text: str) -> str:
    api_key = _litellm_api_key()
    if not api_key:
        raise RuntimeError("clé LLM non configurée (EMERGENT_LLM_KEY ou ANTHROPIC_API_KEY)")

    import litellm

    models = []
    for m in (
        oracle_model(),
        (os.environ.get("ORACLE_FALLBACK_MODEL") or LITELLM_FALLBACK_MODEL).strip(),
    ):
        if m and m not in models:
            models.append(m)

    last_error = None
    for model in models:
        try:
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_text},
                ],
                api_key=api_key,
                max_tokens=600,
                temperature=0.82,
            )
            content = response.choices[0].message.content
            if content and str(content).strip():
                return str(content).strip()
        except Exception as exc:
            last_error = exc
            logger.warning("Oracle LiteLLM — échec modèle %s: %s", model, exc.__class__.__name__)

    if last_error:
        raise last_error
    raise RuntimeError("réponse vide")


async def _llm_chat(system: str, user_text: str) -> str:
    if oracle_provider() == "openai":
        return await _openai_chat(system, user_text)
    return await _litellm_chat(system, user_text)


def _config_error_reply(exc: RuntimeError) -> str:
    msg = str(exc).lower()
    if "openai_api_key" in msg or "openai" in msg and "manquante" in msg:
        return (
            "L'Oracle médite en silence… "
            "(OPENAI_API_KEY absente — vérifiez backend/.env et ORACLE_PROVIDER=openai.)"
        )
    if "clé" in msg or "emergent" in msg or "anthropic" in msg:
        return (
            "L'Oracle médite en silence… "
            "(clé LLM absente — EMERGENT_LLM_KEY, ANTHROPIC_API_KEY ou OPENAI_API_KEY.)"
        )
    return f"L'Oracle est troublé par les forces obscures… ({exc})"


async def consult_oracle(user_profile: dict, question: str, language: str = "fr") -> str:
    """Generate an Oracle response based on user profile + question."""
    lang = _normalize_language(language or user_profile.get("language"))
    hint = missing_config_hint()
    if hint:
        return f"L'Oracle médite en silence… ({hint})"

    profile_summary = (
        f"Profil du héros:\n"
        f"- Pseudo: {user_profile.get('username', 'Inconnu')}\n"
        f"- Classe: {user_profile.get('class_name', 'Aucune')}\n"
        f"- Niveau: {user_profile.get('level', 1)} / 999\n"
        f"- XP: {user_profile.get('xp', 0)}\n"
        f"- Rang: {user_profile.get('rank', 'Novice')}\n"
        f"- Titre actif: {user_profile.get('active_title', 'Aucun')}\n"
        f"- Badges: {user_profile.get('badge_count', 0)}\n"
        f"- Réputation: {user_profile.get('reputation', 0)}\n"
        f"- Écus: {user_profile.get('aether', 0)}\n"
    )
    full_question = f"{profile_summary}\n\nLe héros demande: {question}"

    try:
        return await _llm_chat(_oracle_consult_prompt(lang), full_question)
    except RuntimeError as exc:
        return _config_error_reply(exc)
    except Exception:
        logger.exception("Oracle consult failed")
        return "L'Oracle est troublé par les forces obscures… Les braises s'éteignent un instant."


async def generate_personalized_quest(user_profile: dict, language: str = "fr") -> dict:
    """Generate a personalized quest for the user."""
    lang = _normalize_language(language or user_profile.get("language"))
    fallback = ORACLE_QUEST_FALLBACK.get(lang, ORACLE_QUEST_FALLBACK["fr"])
    if missing_config_hint():
        return {**fallback, "xp": 100, "aether": 50}

    lang_name = ORACLE_LANG_NAMES[lang]
    prompt = f"""Generate ONE personalized RPG quest for this hero as strict JSON (no markdown), in {lang_name}:
{{"name": "short epic name", "description": "one sentence description", "xp": number between 50 and 500, "aether": number between 20 and 200}}

Hero:
- Class: {user_profile.get('class_name', 'Adventurer')}
- Level: {user_profile.get('level', 1)}
- Username: {user_profile.get('username', 'Hero')}

Scale difficulty to level. Return ONLY the JSON, nothing else."""

    try:
        system = ORACLE_QUEST_SYSTEM.get(lang, ORACLE_QUEST_SYSTEM["fr"])
        text = await _llm_chat(system, prompt)
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        return {
            "name": str(data.get("name", fallback["name"]))[:80],
            "description": str(data.get("description", fallback["description"]))[:200],
            "xp": int(data.get("xp", 100)),
            "aether": int(data.get("aether", 50)),
        }
    except RuntimeError:
        return {**fallback, "xp": 100, "aether": 50}
    except Exception:
        logger.exception("Oracle quest generation failed")
        return {**fallback, "xp": 100, "aether": 50}
