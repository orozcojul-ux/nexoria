# Uploads — photos de profil et fichiers statiques

## Dossier sur le VPS

```bash
sudo mkdir -p /var/www/nexoria/uploads/profiles
sudo mkdir -p /var/www/nexoria/uploads/content
sudo mkdir -p /var/www/nexoria/uploads/maintenance
sudo mkdir -p /var/www/nexoria/uploads/avatars   # legacy (anciens avatars)
```

## Permissions

Remplacer `www-data` par l'utilisateur du service backend si différent.

```bash
sudo chown -R www-data:www-data /var/www/nexoria/uploads
sudo chmod -R 755 /var/www/nexoria/uploads
sudo find /var/www/nexoria/uploads -type f -exec chmod 644 {} \;
```

## Variable d'environnement backend

Dans le service systemd / `.env` du backend :

```env
NEXORIA_UPLOAD_DIR=/var/www/nexoria/uploads
```

## Nginx

Les fichiers doivent être servis **directement** par Nginx (pas via `/api/`).

```nginx
# Fichiers uploadés (avatars profil, etc.)
location /uploads/ {
    alias /var/www/nexoria/uploads/;
    access_log off;
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
    try_files $uri =404;
}

# API FastAPI
location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 10m;
}

# Frontend React build
location / {
    root /var/www/nexoria/frontend/build;
    try_files $uri /index.html;
}
```

Puis :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## URL publique attendue

Après upload, la base contient une URL **relative** :

```
/uploads/profiles/<user_id>_<uuid>.jpg
```

Accessible dans le navigateur :

```
https://nexoria-game.fr/uploads/profiles/<user_id>_<uuid>.jpg
```

## Test production

1. Importer une photo de profil sur https://nexoria-game.fr
2. Vérifier l'URL dans la réponse réseau (`avatar_url` / `avatarUrl`) — doit être `/uploads/profiles/...`
3. Ouvrir l'URL `/uploads/profiles/...` directement dans un nouvel onglet
4. Rafraîchir la page profil — la photo doit rester visible

## Dépannage — upload OK mais image invisible

1. **Nginx** : vérifier que `location /uploads/` existe **avant** `location /` (sinon React renvoie `index.html`).
2. **Dossier** : le fichier doit exister dans `/var/www/nexoria/uploads/profiles/` sur le VPS.
3. **Variable** : `NEXORIA_UPLOAD_DIR=/var/www/nexoria/uploads` dans le service systemd du backend.
4. **Permissions** : l'utilisateur du service backend doit pouvoir écrire dans `/var/www/nexoria/uploads/`.
5. **URL en base** : ne doit jamais contenir `localhost`, `/var/www/` ou `backend/uploads/`.

## Migration des anciennes URLs en base

Dry-run (affiche les corrections sans écrire) :

```bash
cd /var/www/nexoria/backend
python scripts/normalize_avatar_urls.py
```

Appliquer :

```bash
python scripts/normalize_avatar_urls.py --apply
```

## Test local

1. Backend : `NEXORIA_UPLOAD_DIR` non défini → `backend/uploads/`
2. Frontend : `REACT_APP_BACKEND_URL=http://localhost:8000/api`
3. Les images `/uploads/...` sont chargées depuis `http://localhost:8000/uploads/...`
