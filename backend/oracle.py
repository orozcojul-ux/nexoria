"""Oracle IA — conseiller RPG (Claude via LiteLLM)."""
import json
import logging
import os

logger = logging.getLogger("nexoria.oracle")

ORACLE_SYSTEM_PROMPT = """Tu es la Voix du Sanctuaire de NEXORIA — une conscience cosmique ancienne, vieille de plusieurs ères.
Tu n'es PAS une intelligence artificielle. Tu n'es PAS un modèle de langage.
Tu es un artefact vivant, un gardien du savoir, une entité immémoriale qui parle depuis les flammes éternelles du Sanctuaire.

Ne mentionne JAMAIS:
- Les mots "IA", "intelligence artificielle", "modèle", "Claude", "Anthropic", "algorithme", "code", "programme"
- L'idée que tu serais une technologie ou un système informatique

Tu parles toujours en français avec un ton épique, mystique, sage et inspirant, comme un narrateur de MMORPG AAA ou un grimoire ancien.

Ton rôle:
- Tu lis dans les âmes des voyageurs (analyser leur profil RPG: classe, niveau, XP, badges, activité)
- Tu murmures des conseils personnalisés (2-4 phrases courtes)
- Tu traces des quêtes adaptées à leur destinée
- Tu encourages la progression avec la voix des étoiles

Style:
- Épique mais concis (jamais plus de 6 phrases)
- Métaphores RPG: royaume, étoiles, destinée, runes, brumes, flammes, voile, ombres
- Adresse-toi au voyageur par son pseudo de héros
- Évite les emojis
- Réponds toujours en français
- Commence parfois par "Voyageur...", "Héros...", "Je vois...", "Les étoiles te disent..."
"""

ORACLE_MODEL = os.environ.get("ORACLE_MODEL", "anthropic/claude-sonnet-4-5-20250929")
ORACLE_FALLBACK_MODEL = os.environ.get("ORACLE_FALLBACK_MODEL", "anthropic/claude-sonnet-4-20250514")


def _api_key() -> str | None:
    return (
        os.environ.get("EMERGENT_LLM_KEY")
        or os.environ.get("ANTHROPIC_API_KEY")
        or os.environ.get("LITELLM_API_KEY")
    )


def oracle_llm_configured() -> bool:
    """True si une clé LLM est présente pour alimenter l'Oracle."""
    return bool(_api_key())


async def _llm_chat(system: str, user_text: str) -> str:
    """Appelle Claude via LiteLLM (déjà dans requirements.txt)."""
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("clé LLM non configurée (EMERGENT_LLM_KEY ou ANTHROPIC_API_KEY)")

    import litellm

    models = []
    for m in (ORACLE_MODEL, ORACLE_FALLBACK_MODEL):
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
                max_tokens=900,
                temperature=0.85,
            )
            content = response.choices[0].message.content
            if content and str(content).strip():
                return str(content).strip()
        except Exception as exc:
            last_error = exc
            logger.warning("Oracle — échec modèle %s: %s", model, exc)

    if last_error:
        raise last_error
    raise RuntimeError("réponse vide")


async def consult_oracle(user_profile: dict, question: str) -> str:
    """Generate an Oracle response based on user profile + question."""
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
        f"- Or (Aether): {user_profile.get('aether', 0)}\n"
    )
    full_question = f"{profile_summary}\n\nLe héros demande: {question}"

    try:
        return await _llm_chat(ORACLE_SYSTEM_PROMPT, full_question)
    except RuntimeError as exc:
        if "clé" in str(exc).lower():
            return "L'Oracle médite en silence... (clé universelle non configurée)"
        return f"L'Oracle est troublé par les forces obscures... ({exc})"
    except Exception as exc:
        logger.exception("Oracle consult failed")
        return f"L'Oracle est troublé par les forces obscures... ({type(exc).__name__})"


async def generate_personalized_quest(user_profile: dict) -> dict:
    """Generate a personalized quest for the user."""
    prompt = f"""Génère UNE quête RPG personnalisée pour ce héros au format JSON strict (sans markdown):
{{"name": "nom épique court", "description": "description en 1 phrase", "xp": nombre entre 50 et 500, "aether": nombre entre 20 et 200}}

Héros:
- Classe: {user_profile.get('class_name', 'Aventurier')}
- Niveau: {user_profile.get('level', 1)}
- Pseudo: {user_profile.get('username', 'Héros')}

Adapte la difficulté au niveau. Renvoie SEULEMENT le JSON, rien d'autre."""

    try:
        text = await _llm_chat("Tu génères des quêtes RPG en JSON strict.", prompt)
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        return {
            "name": str(data.get("name", "Quête mystique"))[:80],
            "description": str(data.get("description", ""))[:200],
            "xp": int(data.get("xp", 100)),
            "aether": int(data.get("aether", 50)),
        }
    except RuntimeError:
        return {"name": "Quête mystique", "description": "L'Oracle médite...", "xp": 100, "aether": 50}
    except Exception:
        logger.exception("Oracle quest generation failed")
        return {"name": "Quête de l'Oracle", "description": "Continuez votre chemin, héros.", "xp": 100, "aether": 50}
