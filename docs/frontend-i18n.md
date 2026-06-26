# NEXORIA — Internationalisation frontend (i18next)

Le site utilise **i18next** + **react-i18next** pour traduire toute l'interface.

## Architecture

| Fichier | Rôle |
|---------|------|
| `src/i18n/i18next.js` | Configuration i18next (fallback `fr`, clé localStorage `nexoria_language`) |
| `src/i18n/LanguageProvider.jsx` | Provider global + hook `useI18n()` / `useTranslation()` |
| `src/i18n/loadTranslations.js` | Fusion des modules JS → dictionnaire plat |
| `src/i18n/translations-pages-ext.js` | Clés pages (guildes, forge, forum, tickets, amis…) |
| `src/i18n/locales/*.json` | Export JSON (sync via `npm run i18n:sync`) |
| `src/components/LanguageSelector.jsx` | Sélecteur de langue (alias `LanguageSwitcher`) |
| `src/lib/languages.js` | Langues supportées |
| `src/lib/i18n-api.js` | Erreurs API traduites |

## Langues supportées

`fr`, `en`, `es`, `de`, `it`, `pt-BR` (code app `pt`), `nl`, `ja`

## Utilisation dans un composant

```jsx
import { useI18n } from "@/contexts/I18nContext";

function MyPage() {
  const { t, lang, setLang, fmtDate } = useI18n();
  return (
    <>
      <h1>{t("home.welcome")}</h1>
      <p>{t("home.welcomeUser", { username: "Aria" })}</p>
      <span>{fmtDate(user.last_login)}</span>
    </>
  );
}
```

## Ajouter une phrase

1. Ajouter la clé dans le module JS approprié (`translations-pages.js`, `translations-ui.js`, etc.) :

```javascript
"shop.buy": T("Acheter", "Buy", { es: "Comprar", de: "Kaufen", ... }),
```

2. Utiliser `t("shop.buy")` dans le composant.
3. Synchroniser les JSON : `npm run i18n:sync`
4. Vérifier : `npm run i18n:check`

## Ajouter une langue

1. Ajouter l'entrée dans `src/lib/languages.js`
2. Étendre le helper `T()` avec la nouvelle langue
3. Ajouter le code dans `scripts/sync-i18n-json.mjs` (`LANGS`)
4. Mettre à jour `supportedLngs` dans `i18next.js`
5. `npm run i18n:sync`

## Variables dynamiques

```jsx
t("economy.ecusCount", { count: 42 })
t("inventory.trade.sent", { name: username })
```

## Pluriels

Utiliser les suffixes i18next `_one` / `_other` :

```javascript
"economy.ecusCount_one": T("{count} Écu", "{count} Écu"),
"economy.ecusCount_other": T("{count} Écus", "{count} Écus"),
```

## Fallback

- Langue manquante → **français**
- Jamais afficher une clé brute (`nav.profile`) à l'écran
- Warning console en développement uniquement

## Ne pas traduire

- Messages de forum / chat écrits par les joueurs
- Pseudos, emails, noms de personnages
- URLs, tokens, clés bêta, IDs techniques
- Contenu utilisateur généré

## Maintenance

La page `/maintenance` partage le même provider et la clé `nexoria_language`. Les clés maintenance restent dans `maintenanceTranslations.js`.

## Commandes

```bash
cd frontend
npm run i18n:sync    # régénère locales/*.json
npm run i18n:check   # vérifie les clés manquantes
npm run build
```

## Provider global

`LanguageProvider` enveloppe toute l'app dans `App.js`. Toute page peut appeler `useI18n()`.

Le sélecteur de langue est présent dans `SiteHeader`, auth, landing et paramètres.
