# Configuration Oracle IA — NEXORIA

L'Oracle (Sanctuaire) interroge un LLM **côté backend uniquement** (jamais depuis le frontend).

---

## Provider OpenAI (recommandé production)

Dans `backend/.env` :

```env
ORACLE_PROVIDER=openai
OPENAI_API_KEY=sk-...
ORACLE_MODEL=gpt-4.1-mini
```

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `ORACLE_PROVIDER` | oui | `openai` pour forcer OpenAI |
| `OPENAI_API_KEY` | oui | Clé API OpenAI |
| `ORACLE_MODEL` | non | Défaut : `gpt-4.1-mini` |

---

## Provider legacy (Emergent / Anthropic via LiteLLM)

```env
# ORACLE_PROVIDER non défini ou litellm
EMERGENT_LLM_KEY=votre_cle
# ou
ANTHROPIC_API_KEY=sk-ant-...

ORACLE_MODEL=anthropic/claude-sonnet-4-5-20250929
ORACLE_FALLBACK_MODEL=anthropic/claude-sonnet-4-20250514
```

---

## Redémarrer le backend

Après modification de `.env`, redémarrez FastAPI (systemd, uvicorn, etc.).

---

## Vérifier

1. `GET /api/oracle/status` (connecté) doit retourner :

```json
{
  "llm_configured": true,
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "config_hint": null
}
```

2. Page `/oracle` — la bannière amber ne doit plus s'afficher.
3. Poser une question — réponse en français, style dark fantasy, 2–4 phrases.

Test rapide :

```powershell
curl -H "Authorization: Bearer VOTRE_TOKEN" https://nexoria-game.fr/api/oracle/status
```

---

## Dépannage

| Symptôme | Cause probable |
|----------|----------------|
| Bannière « OPENAI_API_KEY manquante » | `.env` incomplet ou backend non redémarré |
| « module indisponible » | Erreur import — `pip install -r requirements.txt` |
| « forces obscures » | Clé invalide, modèle inexistant ou quota API épuisé — logs backend |
| Toujours message Emergent/Anthropic | `ORACLE_PROVIDER=openai` absent ou `OPENAI_API_KEY` vide |

---

## Sécurité

- Ne jamais exposer `OPENAI_API_KEY` au frontend.
- Les logs backend n'impriment jamais la clé API.
