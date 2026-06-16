import React, { useEffect, useState } from "react";
import { Pin, Lock, Trash2, ExternalLink, Edit3, Search, Scroll, Ban, Shield, VolumeX, Eraser } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumButton, PremiumCard, PremiumModal } from "@/components/ui-premium";
import HtmlEditor from "@/components/admin/HtmlEditor";
import ForumModPanel from "@/components/forum/ForumModPanel";
import HeroName from "@/components/HeroName";
import { stripHtml } from "@/lib/stripHtml";

const SURFACE = "relative rounded-xl border border-white/10 bg-gradient-to-br from-[#0F0820]/80 via-[#0A0613]/80 to-[#1A0B3D]/80 backdrop-blur";

const fmtDate = (s) => (s ? new Date(s).toLocaleString("fr-FR") : "—");

function isActiveUntil(iso) {
  return iso && new Date(iso) > new Date();
}

export default function ForumModerationAdmin() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "admin";
  const [view, setView] = useState("threads");
  const [threads, setThreads] = useState([]);
  const [filter, setFilter] = useState("all");
  const [editThread, setEditThread] = useState(null);
  const [userQuery, setUserQuery] = useState("");
  const [targetUser, setTargetUser] = useState(null);
  const [siteBan, setSiteBan] = useState(null);

  const loadThreads = async () => {
    try {
      const r = await api.get("/admin/forum/threads");
      setThreads(r.data);
    } catch {
      toast.error("Impossible de charger les sujets");
    }
  };

  useEffect(() => { loadThreads(); }, []);

  const filtered = threads.filter((t) => {
    if (filter === "pinned") return t.pinned;
    if (filter === "locked") return t.locked;
    if (filter === "hot") return (t.replies_count || 0) >= 5;
    return true;
  });

  const act = async (threadId, action) => {
    try {
      if (action === "delete") {
        if (!window.confirm("Supprimer ce sujet et toutes ses réponses ?")) return;
        await api.delete(`/forum/threads/${threadId}`);
        toast.success("Sujet supprimé");
      } else {
        await api.post(`/forum/threads/${threadId}/${action}`);
        toast.success(action === "pin" ? "Épinglage basculé" : "Verrouillage basculé");
      }
      await loadThreads();
    } catch {
      toast.error("Action impossible");
    }
  };

  const searchUser = async (e) => {
    e?.preventDefault();
    const q = userQuery.trim();
    if (q.length < 2) return;
    try {
      const r = await api.get("/admin/forum/search-user", { params: { q } });
      setTargetUser(r.data);
    } catch (err) {
      setTargetUser(null);
      toast.error(formatApiError(err) || "Héros introuvable");
    }
  };

  const submitSiteBan = async (e) => {
    e.preventDefault();
    if (!siteBan) return;
    try {
      await api.post(`/admin/users/${siteBan.user_id}/ban`, {
        duration_hours: siteBan.hours,
        reason: siteBan.reason,
      });
      toast.success(`${siteBan.username} banni du site`);
      setSiteBan(null);
      await searchUser();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="space-y-5" data-testid="admin-forum-mod">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "threads", label: "Sujets" },
          { id: "sanctions", label: "Sanctions joueurs" },
          ...(isAdmin ? [{ id: "cleanup", label: "Nettoyage" }] : []),
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              view === v.id ? "border-violet-500/60 text-violet-200 bg-violet-500/15" : "border-white/10 text-zinc-500"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "threads" && (
        <>
          <p className="text-xs text-zinc-500 italic">
            Gestion complète des sujets. Les sanctions joueurs (exclusion, mute, ban site) sont dans l&apos;onglet Sanctions.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Tous" },
              { id: "pinned", label: "Épinglés" },
              { id: "locked", label: "Verrouillés" },
              { id: "hot", label: "Populaires (5+)" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filter === f.id ? "border-amber-500/50 text-amber-200 bg-amber-500/10" : "border-white/10 text-zinc-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className={`${SURFACE} rounded-2xl overflow-hidden`}>
            {filtered.length === 0 && (
              <div className="p-10 text-center text-zinc-500 italic">Aucun sujet dans ce filtre</div>
            )}
            {filtered.map((t) => (
              <div key={t.thread_id} className="px-4 py-3 border-b border-white/5 hover:bg-white/[0.02]" data-testid={`admin-forum-${t.thread_id}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {t.pinned && <Pin className="w-3 h-3 text-yellow-400" />}
                      {t.locked && <Lock className="w-3 h-3 text-red-400" />}
                      <span className="font-display font-semibold text-sm text-white truncate">{t.title}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 flex flex-wrap gap-2">
                      <span>{t.category_name}</span>
                      <span>·</span>
                      <HeroName user={t.author} size="sm" />
                      <span>· {t.replies_count} rép. · {t.views} vues</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => setEditThread(t)} className="p-1.5 rounded border border-white/10 text-cyan-400 hover:bg-white/[0.03]" title="Modifier">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => act(t.thread_id, "pin")} className="p-1.5 rounded border border-white/10 text-yellow-400 hover:bg-white/[0.03]" title="Épingler">
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => act(t.thread_id, "lock")} className="p-1.5 rounded border border-white/10 text-red-400 hover:bg-white/[0.03]" title="Verrouiller">
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => act(t.thread_id, "delete")} className="p-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/5" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <a href={`/forum?cat=${t.category}&thread=${t.thread_id}`} className="p-1.5 rounded border border-white/10 text-cyan-400 hover:bg-white/[0.03]" title="Ouvrir">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "sanctions" && (
        <div className="space-y-4">
          <PremiumCard tone="gold" className="p-4">
            <p className="text-xs text-zinc-400 mb-3">
              <strong className="text-amber-300">Exclusion forum</strong> — bloque la Tribune uniquement.
              <br />
              <strong className="text-amber-300">Mute forum</strong> — lecture seule sur le forum.
              <br />
              <strong className="text-red-300">Ban site</strong> — exil du royaume entier (Archontes).
            </p>
            <form onSubmit={searchUser} className="flex gap-2">
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Pseudo du héros..."
                className="flex-1 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm"
                data-testid="forum-mod-search-user"
              />
              <PremiumButton type="submit" variant="cyan" size="sm" icon={Search}>
                Chercher
              </PremiumButton>
            </form>
          </PremiumCard>

          {targetUser && (
            <PremiumCard tone="violet" className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <HeroName user={targetUser} size="md" />
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">{targetUser.role}</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-2 text-[11px]">
                <div className={`rounded-lg border p-2 ${isActiveUntil(targetUser.forum_banned_until) ? "border-amber-500/40 bg-amber-500/10" : "border-white/10"}`}>
                  <Scroll className="w-3.5 h-3.5 text-amber-400 mb-1" />
                  <div className="font-bold text-zinc-300">Exclusion forum</div>
                  <div className="text-zinc-500">{isActiveUntil(targetUser.forum_banned_until) ? fmtDate(targetUser.forum_banned_until) : "—"}</div>
                </div>
                <div className={`rounded-lg border p-2 ${isActiveUntil(targetUser.forum_muted_until) ? "border-cyan-500/40 bg-cyan-500/10" : "border-white/10"}`}>
                  <VolumeX className="w-3.5 h-3.5 text-cyan-400 mb-1" />
                  <div className="font-bold text-zinc-300">Mute forum</div>
                  <div className="text-zinc-500">{isActiveUntil(targetUser.forum_muted_until) ? fmtDate(targetUser.forum_muted_until) : "—"}</div>
                </div>
                <div className={`rounded-lg border p-2 ${isActiveUntil(targetUser.banned_until) ? "border-red-500/40 bg-red-500/10" : "border-white/10"}`}>
                  <Shield className="w-3.5 h-3.5 text-red-400 mb-1" />
                  <div className="font-bold text-zinc-300">Ban site</div>
                  <div className="text-zinc-500">{isActiveUntil(targetUser.banned_until) ? fmtDate(targetUser.banned_until) : "—"}</div>
                </div>
              </div>

              {targetUser.role !== "admin" && (
                <ForumModPanel targetUser={targetUser} onDone={searchUser} />
              )}

              {isAdmin && targetUser.role !== "admin" && (
                <PremiumButton
                  variant="ghost"
                  size="sm"
                  icon={Ban}
                  onClick={() => setSiteBan({ user_id: targetUser.user_id, username: targetUser.username, hours: 24, reason: "" })}
                  testid="forum-mod-site-ban"
                >
                  Bannir du site (royaume)
                </PremiumButton>
              )}
            </PremiumCard>
          )}
        </div>
      )}

      {view === "cleanup" && isAdmin && (
        <ForumCleanupPanel />
      )}

      {editThread && (
        <ThreadEditModal
          thread={editThread}
          onClose={() => setEditThread(null)}
          onSaved={async () => { setEditThread(null); await loadThreads(); }}
        />
      )}

      {siteBan && (
        <PremiumModal open onClose={() => setSiteBan(null)} title={`Ban site — ${siteBan.username}`} icon={Ban} maxWidth="max-w-md" testid="forum-admin-site-ban">
          <form onSubmit={submitSiteBan} className="p-5 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Durée (heures)</label>
              <input
                type="number"
                min={1}
                max={87600}
                value={siteBan.hours}
                onChange={(e) => setSiteBan((s) => ({ ...s, hours: Number(e.target.value) }))}
                className="w-full bg-[#0A0A0E] border border-red-500/30 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Motif</label>
              <textarea
                required
                value={siteBan.reason}
                onChange={(e) => setSiteBan((s) => ({ ...s, reason: e.target.value }))}
                rows={3}
                className="w-full bg-[#0A0A0E] border border-red-500/30 rounded px-3 py-2 text-sm"
              />
            </div>
            <PremiumButton type="submit" variant="gold" size="sm" className="w-full">
              Confirmer le ban site
            </PremiumButton>
          </form>
        </PremiumModal>
      )}
    </div>
  );
}

function ForumCleanupPanel() {
  const [mode, setMode] = useState("stale_zero");
  const [days, setDays] = useState(30);
  const [confirm, setConfirm] = useState("");
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/pulse").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const run = async (e) => {
    e.preventDefault();
    if (confirm.trim().toUpperCase() !== "NETTOYER") {
      toast.error('Tapez « NETTOYER » pour confirmer');
      return;
    }
    setRunning(true);
    try {
      const { data } = await api.post("/admin/forum/cleanup", { mode, days, confirm });
      toast.success(`${data.deleted_threads} sujets et ${data.deleted_replies} réponses supprimés`);
      setConfirm("");
      const r = await api.get("/admin/pulse");
      setStats(r.data);
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur");
    } finally {
      setRunning(false);
    }
  };

  const modes = [
    { id: "stale_zero", label: "Sujets sans réponse", desc: "Supprime les sujets à 0 réponse plus vieux que N jours." },
    { id: "older_than", label: "Anciens sujets", desc: "Supprime TOUS les sujets (et réponses) plus vieux que N jours." },
    { id: "orphan_replies", label: "Réponses orphelines", desc: "Supprime les réponses dont le sujet parent n'existe plus." },
  ];

  return (
    <PremiumCard tone="red" className="p-5 max-w-2xl space-y-4" testid="forum-cleanup-panel">
      <div className="flex items-center gap-2">
        <Eraser className="w-5 h-5 text-red-400" />
        <h3 className="font-display font-bold text-lg text-red-200">Nettoyage du forum</h3>
      </div>
      {stats && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-white/10 p-2"><span className="text-zinc-500">Sujets</span> <span className="font-mono-stat text-white font-bold ml-1">{stats.forum_threads}</span></div>
          <div className="rounded-lg border border-white/10 p-2"><span className="text-zinc-500">Réponses</span> <span className="font-mono-stat text-white font-bold ml-1">{stats.forum_replies}</span></div>
        </div>
      )}
      <p className="text-xs text-zinc-500 italic">Action irréversible — réservée aux Archontes.</p>
      <div className="space-y-2">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`w-full text-left rounded-lg border p-3 transition-all ${mode === m.id ? "border-red-500/50 bg-red-500/10" : "border-white/10 hover:border-white/20"}`}
          >
            <div className="font-display font-bold text-sm text-white">{m.label}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>
      {mode !== "orphan_replies" && (
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Âge minimum (jours)</label>
          <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat" />
        </div>
      )}
      <form onSubmit={run} className="space-y-3">
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder='Tapez NETTOYER pour confirmer'
          className="w-full bg-[#0A0A0E] border border-red-500/30 rounded px-3 py-2 text-sm uppercase tracking-widest"
          data-testid="forum-cleanup-confirm"
        />
        <PremiumButton type="submit" variant="gold" size="sm" icon={Eraser} disabled={running} className="w-full" testid="forum-cleanup-run">
          Lancer le nettoyage
        </PremiumButton>
      </form>
    </PremiumCard>
  );
}

function ThreadEditModal({ thread, onClose, onSaved }) {
  const [title, setTitle] = useState(thread.title || "");
  const [contentHtml, setContentHtml] = useState(thread.content_html || thread.content || "");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const plain = stripHtml(contentHtml).trim();
    if (plain.length < 10) {
      toast.error("Contenu trop court");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/forum/threads/${thread.thread_id}`, {
        title: title.trim(),
        content: plain,
        content_html: contentHtml,
      });
      toast.success("Sujet modifié");
      await onSaved();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumModal open onClose={onClose} title="Modifier le sujet" icon={Edit3} maxWidth="max-w-3xl" testid="admin-thread-edit">
      <form onSubmit={submit} className="p-5 space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm"
          required
          minLength={5}
          maxLength={120}
        />
        <HtmlEditor value={contentHtml} onChange={setContentHtml} minHeight={180} label="Contenu" variant="forum" />
        <PremiumButton type="submit" variant="cyan" size="sm" disabled={saving} className="w-full">
          Enregistrer
        </PremiumButton>
      </form>
    </PremiumModal>
  );
}
