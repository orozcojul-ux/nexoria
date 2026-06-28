# PWA NEXORIA — installation mobile

NEXORIA peut être installée comme **Progressive Web App (PWA)** sur l’écran d’accueil Android/iOS, avant une application native.

Production : [https://nexoria-game.fr](https://nexoria-game.fr)

## Fichiers créés

| Fichier | Rôle |
|---------|------|
| `frontend/public/manifest.json` | Métadonnées PWA (nom, couleurs, icônes, `display: standalone`) |
| `frontend/public/service-worker.js` | Cache léger des assets statiques uniquement |
| `frontend/public/icons/icon-192.png` | Icône 192×192 |
| `frontend/public/icons/icon-512.png` | Icône 512×512 |
| `frontend/public/icons/maskable-icon-512.png` | Icône maskable Android |
| `frontend/public/icons/apple-touch-icon.png` | Icône iOS (180×180) |
| `frontend/scripts/generate-pwa-icons.mjs` | Régénère les PNG depuis `favicon.svg` |
| `frontend/src/registerServiceWorker.js` | Enregistrement SW (production) |
| `frontend/src/lib/pwa.js` | Détection mobile / standalone / iOS |
| `frontend/src/hooks/usePwaInstall.js` | Hook `beforeinstallprompt` |
| `frontend/src/components/InstallAppButton.jsx` | Bouton « Installer NEXORIA » |
| `frontend/public/index.html` | Meta PWA + manifest + apple-touch-icon |

## Ce qui n’est **pas** mis en cache

- Appels `/api/*` (auth, profil, boutique, Nexus, etc.)
- WebSocket / Socket.IO
- Callbacks OAuth / Discord
- Uploads et médias utilisateur dynamiques
- Pages HTML (navigation = réseau)

Seuls les fichiers statiques (`/static/`, fonts, JS/CSS build, icônes, manifest) peuvent être mis en cache.

## Tester en local

```bash
cd frontend
npm run build
npx serve -s build -l 3000
```

Ouvrir `http://localhost:3000` en **HTTPS** ou utiliser Chrome DevTools :

1. **Application → Manifest** : vérifier nom, icônes, theme color
2. **Application → Service Workers** : SW actif (build production uniquement)
3. **Lighthouse → Progressive Web App** : audit installabilité

Le service worker n’est enregistré qu’en `NODE_ENV=production` (`npm run build` + serveur statique).

Vérifications rapides après déploiement :

- `https://nexoria-game.fr/manifest.json`
- `https://nexoria-game.fr/icons/icon-512.png`
- `https://nexoria-game.fr/service-worker.js`

## Installer sur Android (Chrome)

1. Ouvrir [https://nexoria-game.fr](https://nexoria-game.fr) dans **Chrome**
2. Attendre le bandeau « Ajouter à l’écran d’accueil » **ou**
3. Aller dans **Paramètres → Préférences → Installer NEXORIA**
4. Appuyer sur **Installer**

Critères Chrome : HTTPS, manifest valide, service worker, icônes 192+512.

## Installer sur iPhone (Safari)

iOS ne supporte pas `beforeinstallprompt`. L’app propose un guide :

1. Ouvrir le site dans **Safari** (pas Chrome iOS pour l’ajout optimal)
2. **Paramètres → Installer NEXORIA → Comment faire sur iPhone**
3. **Partager** (icône en bas) → **Sur l’écran d’accueil** → **Ajouter**

## Limites iOS

- Pas de prompt d’installation automatique
- Notifications push limitées (iOS 16.4+ pour PWA installées)
- Stockage / cache plus restrictif
- Pas de vraie icône maskable côté système (Safari recadre)
- Mises à jour : rechargement de l’app pour prendre le nouveau SW

## Régénérer les icônes

```bash
cd frontend
npm run pwa:icons
```

Source : `public/favicon.svg` (logo N violet / couronne dorée).

## Backend

Aucune modification backend requise. Les routes API restent inchangées.
