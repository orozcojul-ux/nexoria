"""Oracle IA - Claude Sonnet 4.5 powered RPG advisor.
Generates personalized quests, advice, and objectives based on user profile/activity.
"""
import os
from emergentintegrations.llm.chat import LlmChat, UserMessage


ORACLE_SYSTEM_PROMPT = """Tu es l'Oracle de NEXORIA, une entité mystique RPG omnisciente.
Tu parles en français avec un ton épique, sage et inspirant, comme un narrateur de MMORPG AAA.

Ton rôle:
- Analyser le profil RPG du joueur (classe, niveau, XP, badges, activité)
- Donner des conseils personnalisés en 2-4 phrases
- Suggérer des quêtes adaptées au profil
- Encourager la progression sans flatter

Style:
- Épique mais concis (jamais plus de 6 phrases)
- Utilise des métaphores RPG (royaume, étoiles, destinée, runes...)
- Adresse-toi au joueur par son pseudo
- Évite les emojis
- Réponds toujours en français
"""


async def consult_oracle(user_profile: dict, question: str) -> str:
    """Generate an Oracle response based on user profile + question."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return "L'Oracle médite en silence... (clé universelle non configurée)"

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

    session_id = f"oracle_{user_profile.get('user_id', 'anon')}"

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=ORACLE_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    full_question = f"{profile_summary}\n\nLe héros demande: {question}"

    try:
        response = await chat.send_message(UserMessage(text=full_question))
        return str(response).strip()
    except Exception as e:
        return f"L'Oracle est troublé par les forces obscures... ({type(e).__name__})"


async def generate_personalized_quest(user_profile: dict) -> dict:
    """Generate a personalized quest for the user."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return {"name": "Quête mystique", "description": "L'Oracle médite...", "xp": 100, "aether": 50}

    prompt = f"""Génère UNE quête RPG personnalisée pour ce héros au format JSON strict (sans markdown):
{{"name": "nom épique court", "description": "description en 1 phrase", "xp": nombre entre 50 et 500, "aether": nombre entre 20 et 200}}

Héros:
- Classe: {user_profile.get('class_name', 'Aventurier')}
- Niveau: {user_profile.get('level', 1)}
- Pseudo: {user_profile.get('username', 'Héros')}

Adapte la difficulté au niveau. Renvoie SEULEMENT le JSON, rien d'autre."""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"quest_{user_profile.get('user_id', 'anon')}",
        system_message="Tu génères des quêtes RPG en JSON strict.",
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        import json
        response = await chat.send_message(UserMessage(text=prompt))
        text = str(response).strip()
        # Extract JSON
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()
        data = json.loads(text)
        return {
            "name": str(data.get("name", "Quête mystique"))[:80],
            "description": str(data.get("description", ""))[:200],
            "xp": int(data.get("xp", 100)),
            "aether": int(data.get("aether", 50)),
        }
    except Exception:
        return {"name": "Quête de l'Oracle", "description": "Continuez votre chemin, héros.", "xp": 100, "aether": 50}
