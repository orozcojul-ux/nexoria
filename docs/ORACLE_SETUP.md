# Configuration Oracle IA — NEXORIA

L'Oracle (Sanctuaire) utilise **Claude** via **LiteLLM**. Sans clé API, il répond :

> *L'Oracle médite en silence... (clé universelle non configurée)*

---

## 1. Choisir une clé

Une seule variable suffit dans `backend/.env` :

| Variable | Usage |
|----------|--------|
| `EMERGENT_LLM_KEY` | Clé universelle Emergent (déploiement Emergent / preview) |
| `ANTHROPIC_API_KEY` | Clé directe [Anthropic Console](https://console.anthropic.com/) |
| `LITELLM_API_KEY` | Alternative si vous passez par un proxy LiteLLM |

---

## 2. Exemple `backend/.env`

```env
# Oracle IA — une seule ligne suffit
EMERGENT_LLM_KEY=votre_cle_ici

# Ou en local avec Anthropic directement :
# ANTHROPIC_API_KEY=sk-ant-api03-...
```

Modèles utilisés par défaut (surchargeables) :

```env
ORACLE_MODEL=anthropic/claude-sonnet-4-5-20250929
ORACLE_FALLBACK_MODEL=anthropic/claude-sonnet-4-20250514
```

---

## 3. Redémarrer le backend

Après modification de `.env`, **redémarrez** le serveur FastAPI :

```powershell
Set-Location C:\Users\33647\Projects\nexoria\backend
# Arrêtez le processus en cours, puis relancez votre commande habituelle (uvicorn, etc.)
```

---

## 4. Vérifier

1. Ouvrez `/oracle` dans le jeu (niveau 10+ requis pour entrer au Sanctuaire).
2. La bannière en haut ne doit plus indiquer « clé non configurée ».
3. Ou appelez `GET /api/oracle/status` (connecté) : `"llm_configured": true`.

Test rapide :

```powershell
curl -H "Authorization: Bearer VOTRE_JWT" http://localhost:8000/api/oracle/status
```

---

## 5. Accès joueur (rappel)

Même avec la clé configurée, un héros doit remplir **une** de ces conditions :

- Niveau **≥ 20**, ou
- Sanctuaire du royaume amélioré (niveau 1+), ou
- Perk boutique **Lien à l'Oracle** (consultations illimitées)

Limite quotidienne sinon : **1** consultation/jour ( **3** si Sanctuaire actif).

---

## Dépannage

| Symptôme | Cause probable |
|----------|----------------|
| « clé universelle non configurée » | `.env` sans `EMERGENT_LLM_KEY` / `ANTHROPIC_API_KEY`, ou backend non redémarré |
| « module indisponible » | Erreur d'import `oracle.py` / `litellm` — vérifiez `pip install -r requirements.txt` |
| « Niveau 10 requis » | Compte trop jeune pour le Sanctuaire |
| « Limite quotidienne » | Quota atteint — attendre le lendemain ou acheter le Lien à l'Oracle |
| Réponse « forces obscures » | Clé invalide, modèle indisponible ou quota API épuisé — consultez les logs backend |
