# NEXORIA — Internationalisation frontend

## Système

- **Runtime** : [i18next](https://www.i18next.com/) + [react-i18next](https://react.i18next.com/)
- **Stockage langue** : `localStorage.nexoria_language` (fallback `fr`)
- **Fallback traduction** : français (`fallbackLng: "fr"`)
- **Langues** : `fr`, `en`, `es`, `de`, `it`, `pt`, `nl`, `ja` (code API `pt`, fichier `pt-BR.json`)

## Structure

```
frontend/src/i18n/
  index.js              # exports publics
  setupI18n.js          # initialisation i18next
  LanguageProvider.jsx  # Provider React + useI18n()
  languages.js          # codes langues + labels sélecteur
  storage.js            # localStorage nexoria_language
  loadTranslations.js   # fusion modules JS (authoring)
  translations.js         # clés principales (nav, sidebar…)
  translations-extended.js
  translations-ui.js
  translations-legacy.js
  locales/              # JSON runtime (générés)
    fr.json, en.json, …
```

## Ajouter une phrase

1. Ajouter la clé dans le module JS approprié (`translations.js`, `translations-ui.js`, …) :

```javascript
import { T } from "./translations.js";

"shop.new_label": T("Nouveau libellé", "New label"),
```

2. Synchroniser les JSON :

```bash
cd frontend
npm run i18n:sync
```

3. Utiliser dans un composant :

```jsx
import { useI18n } from "@/contexts/I18nContext";

function MyComponent() {
  const { t } = useI18n();
  return <button>{t("shop.new_label")}</button>;
}
```

## Variables dynamiques

```jsx
t("feed.greeting_full", { username: user.username })
// "Bonjour, {{username}} !"
```

Les placeholders `{var}` legacy sont aussi supportés.

## Ajouter une langue

1. Ajouter le code dans `frontend/src/lib/languages.js` et le backend `VALID_LANGUAGES`
2. Ajouter l’entrée dans `frontend/src/i18n/languages.js` (`LANG_SELECTOR_OPTIONS`)
3. Fournir les traductions dans les modules JS (`T("…", "…", { xx: "…" })`)
4. `npm run i18n:sync`
5. Importer le JSON dans `setupI18n.js`

## Sélecteur de langue

Composant : `frontend/src/components/LanguageSelector.jsx`

- Header (`SiteHeader`) — variant compact
- Paramètres — variant pills
- Landing / auth

## Ne pas traduire

- Pseudos, emails, messages joueurs (forum/chat)
- Noms propres utilisateur, IDs, tokens, URLs
- Contenu CMS maintenance (système séparé)

## Maintenance

La page `/maintenance` utilise un système CMS/admin séparé. Elle partage la même clé `nexoria_language` si un sélecteur y est ajouté plus tard.

## Commandes

```bash
cd frontend
npm run i18n:sync    # JS → locales/*.json
npm run i18n:check     # audit clés manquantes
npm run build          # build production
npm start              # dev local
```

## Tests manuels

1. Changer la langue via le globe (header)
2. Naviguer feed / login / settings — textes traduits
3. Refresh — langue conservée
4. Vérifier qu’aucune clé brute (`nav.home`) n’apparaît
5. Console dev : warnings pour clés manquantes uniquement

## Pages couvertes (partiel)

| Zone | Statut |
|------|--------|
| Nav / drawer (labelKey) | ✅ clés i18n |
| Auth (login/register) | ✅ |
| Feed widgets principaux | ✅ partiel |
| Footer global | ✅ |
| Settings | ⚠️ mixte |
| Inventory, Forum, Guilds, Friends, Craft, Nexus… | ❌ à migrer |
| Admin | ⚠️ partiel |
| Maintenance | séparé (CMS) |
