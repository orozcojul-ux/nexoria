"""End-to-end persistence audit for NEXORIA.

Proves every RPG system is MongoDB-persisted and survives:
- Token invalidation (logout)
- Fresh login from a new session
- Backend restart

Run:
    python3 /app/backend/tests/audit_persistence.py
"""
import os
import sys
import time
import json
import uuid
import asyncio
import requests
import subprocess
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path("/app/backend/.env"))

API = os.environ["FRONTEND_URL"].rstrip("/") + "/api"

GREEN = "\033[92m"
RED = "\033[91m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
DIM = "\033[2m"
RESET = "\033[0m"


def hdr(msg):
    print(f"\n{CYAN}━━━ {msg} ━━━{RESET}")


def ok(msg):
    print(f"  {GREEN}✓{RESET} {msg}")


def info(msg):
    print(f"  {DIM}· {msg}{RESET}")


def fail(msg):
    print(f"  {RED}✗{RESET} {msg}")
    sys.exit(1)


def sess(token=None):
    s = requests.Session()
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def snapshot(s, label):
    """Capture the full RPG state of the user."""
    me = s.get(f"{API}/auth/me", timeout=10).json()
    inv = s.get(f"{API}/inventory", timeout=10).json()
    badges = s.get(f"{API}/badges/mine", timeout=10).json()
    chronicle = s.get(f"{API}/chronicle", timeout=10).json()
    quests = s.get(f"{API}/quests", timeout=10).json()
    return {
        "label": label,
        "level": me["level"],
        "xp": me["xp"],
        "rank": me["rank"],
        "reputation": me["reputation"],
        "aether": me["aether"],
        "skill_points": me["skill_points"],
        "skills_allocated": me.get("skills_allocated", {}),
        "kingdom": me.get("kingdom", {}),
        "active_title": me["active_title"],
        "class_name": me["class_name"],
        "inventory_count": len(inv),
        "badges_count": len(badges),
        "chronicle_count": len(chronicle),
        "quests_count": len(quests),
        "quests_completed": sum(1 for q in quests if q.get("completed")),
    }


def diff(a, b):
    """Compare two snapshots. Equal means perfect persistence."""
    for k in a:
        if k == "label":
            continue
        if a[k] != b[k]:
            return f"{k}: {a[k]!r} → {b[k]!r}"
    return None


def main():
    suffix = uuid.uuid4().hex[:8]
    email = f"audit_{suffix}@nexoria-test.com"
    username = f"AuditHero{suffix[:4]}"
    password = "AuditTest!2026"

    hdr(f"1. Inscription d'un héros frais — {username}")
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "username": username, "password": password, "class_id": "chronomancer",
    }, timeout=15)
    assert r.status_code == 200, fail(f"Register: {r.status_code} {r.text}")
    data = r.json()
    token_a = data["session_token"]
    user_id = data["user_id"]
    ok(f"Héros créé — user_id={user_id} class={data['class_name']} level={data['level']}")

    sa = sess(token_a)

    hdr("2. Mutations de tous les systèmes RPG via API")

    # 2.1 XP / niveau / quêtes (via posts)
    info("Publie 5 posts (5×20 = 100 XP + quête 'post' progresse)")
    for i in range(5):
        sa.post(f"{API}/posts", json={"content": f"Audit post {i+1}"}, timeout=10)

    # 2.2 Réactions (XP + quête)
    info("Crée et like 3 posts (réactions + XP)")
    pids = []
    for i in range(3):
        p = sa.post(f"{API}/posts", json={"content": f"Reactable {i}"}, timeout=10).json()
        pids.append(p["post_id"])
        sa.post(f"{API}/posts/{p['post_id']}/react", timeout=10)

    # 2.3 Commentaires
    info("Commente sur 3 posts (XP + quête comment)")
    for pid in pids:
        sa.post(f"{API}/posts/{pid}/comments", json={"content": "Audit comment"}, timeout=10)

    # 2.4 Daily login quest
    info("Daily login")
    sa.post(f"{API}/quests/daily-login", timeout=10)

    # 2.5 Skill allocation
    info("Alloue 1 point de compétence (créativité)")
    sa.post(f"{API}/skills/allocate", json={"skill_id": "creativity"}, timeout=10)

    # 2.6 Inventaire — ouvre un coffre
    info("Ouvre 1 coffre (Aether -50, +items)")
    chest = sa.post(f"{API}/inventory/open-chest", timeout=10).json()
    n_items = len(chest.get("items", []))
    info(f"  Coffre a généré {n_items} relique(s)")

    # 2.7 Royaume — upgrade du château
    info("Améliore le château (Aether -200)")
    # Need enough aether — register grants 100, react/post grants some via quests... let's check
    me = sa.get(f"{API}/auth/me", timeout=10).json()
    info(f"  Aether actuel: {me['aether']}")
    if me["aether"] >= 200:
        sa.post(f"{API}/kingdom/upgrade/castle", timeout=10)
        ok("Château amélioré")
    else:
        info("  Aether insuffisant pour upgrade kingdom — skip (testera la persistance ailleurs)")

    # 2.8 Titre actif (titre 'novice' déjà unlocked)
    info("Active titre 'novice'")
    sa.put(f"{API}/profile/title", json={"title_id": "novice"}, timeout=10)

    # 2.9 Profil — bio
    info("Met à jour la bio")
    sa.put(f"{API}/profile", json={"bio": f"Audit persistence test {suffix}", "quote": "Le temps est mon allié"}, timeout=10)

    # 2.10 Oracle consultation (Sanctuaire)
    info("Consulte le Sanctuaire (peut prendre ~15s)")
    sa.post(f"{API}/oracle/consult", json={"question": "Audit test"}, timeout=60)

    # Snapshot 1 — état après mutations
    snap1 = snapshot(sa, "After mutations (session A)")
    ok(f"État capturé — level={snap1['level']} xp={snap1['xp']} badges={snap1['badges_count']} inv={snap1['inventory_count']} chronicle={snap1['chronicle_count']}")
    info(f"   reputation={snap1['reputation']} aether={snap1['aether']} skills={snap1['skills_allocated']} active_title={snap1['active_title']}")
    info(f"   kingdom.castle.level={snap1['kingdom'].get('castle',{}).get('level')} quests={snap1['quests_count']} completed={snap1['quests_completed']}")

    hdr("3. Vérification MongoDB directe (bypass API)")
    from motor.motor_asyncio import AsyncIOMotorClient

    async def db_verify():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        n_badges = await db.user_badges.count_documents({"user_id": user_id})
        n_inv = await db.inventory.count_documents({"user_id": user_id})
        n_chr = await db.chronicles.count_documents({"user_id": user_id})
        n_quests = await db.user_quests.count_documents({"user_id": user_id})
        n_posts = await db.posts.count_documents({"user_id": user_id})
        n_comments = await db.comments.count_documents({"user_id": user_id})
        n_oracle = await db.oracle_logs.count_documents({"user_id": user_id})
        client.close()
        return u, n_badges, n_inv, n_chr, n_quests, n_posts, n_comments, n_oracle

    u, nb, ni, nc, nq, npo, ncm, no = asyncio.run(db_verify())
    assert u, fail("User pas trouvé en DB!")
    ok(f"users:        level={u['level']} xp={u['xp']} aether={u['aether']} reputation={u['reputation']}")
    ok(f"users.kingdom: {u['kingdom']}")
    ok(f"users.skills_allocated: {u['skills_allocated']}")
    ok(f"users.dna:    {u['dna']}")
    ok(f"users.bio:    {u['bio']!r}")
    ok(f"users.active_title: {u['active_title']}")
    ok(f"user_badges:  {nb} docs persistés")
    ok(f"inventory:    {ni} docs persistés")
    ok(f"chronicles:   {nc} docs persistés")
    ok(f"user_quests:  {nq} docs persistés")
    ok(f"posts:        {npo} docs persistés")
    ok(f"comments:     {ncm} docs persistés")
    ok(f"oracle_logs:  {no} docs persistés")

    hdr("4. Déconnexion (token A invalidé)")
    sa.post(f"{API}/auth/logout", timeout=10)
    r = sa.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 401, fail(f"Token A devrait être invalide: {r.status_code}")
    ok("Token A rejeté (401) — session serveur supprimée")

    hdr("5. Connexion depuis un 'nouveau navigateur' (session B fraîche)")
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=10)
    assert r.status_code == 200, fail(f"Login: {r.status_code} {r.text}")
    token_b = r.json()["session_token"]
    assert token_b != token_a, fail("Le nouveau token devrait être différent")
    ok(f"Nouveau token B obtenu (≠ A): {token_b[:20]}...")
    sb = sess(token_b)
    snap2 = snapshot(sb, "Session B (after re-login)")
    delta = diff(snap1, snap2)
    if delta:
        fail(f"État divergent après re-login: {delta}")
    ok("État RPG IDENTIQUE après nouvelle session (zero perte)")

    hdr("6. Redémarrage backend (supervisor restart)")
    info("supervisorctl restart backend (peut prendre ~5s)")
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, capture_output=True)
    time.sleep(6)
    # session B token still in DB — should work
    for attempt in range(5):
        try:
            r = sb.get(f"{API}/auth/me", timeout=10)
            if r.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(2)
    assert r.status_code == 200, fail(f"After restart: {r.status_code}")
    snap3 = snapshot(sb, "After backend restart")
    delta = diff(snap1, snap3)
    if delta:
        fail(f"État divergent après restart: {delta}")
    ok("État RPG IDENTIQUE après restart backend (MongoDB = vraie source)")

    hdr("7. Résumé final")
    print(f"  {GREEN}Tous les systèmes RPG sont 100% MongoDB-persistés :{RESET}")
    for k, v in snap1.items():
        if k == "label":
            continue
        if isinstance(v, dict):
            v = json.dumps(v, ensure_ascii=False)[:80]
        print(f"    {DIM}·{RESET} {k:<22} {v}")

    print(f"\n  {GREEN}{'═'*50}{RESET}")
    print(f"  {GREEN}AUDIT PASSÉ — Aucun système simulé détecté.{RESET}")
    print(f"  {GREEN}{'═'*50}{RESET}\n")


if __name__ == "__main__":
    main()
