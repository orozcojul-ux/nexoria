import React, { useEffect, useRef, useState } from "react";
import { Newspaper, Plus, Trash2, Eye, EyeOff, Star, StarOff, Pencil, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import HtmlEditor from "@/components/admin/HtmlEditor";
import { stripHtml } from "@/lib/stripHtml";

const CATEGORIES = [
  { id: "announce", label: "Annonce" },
  { id: "event", label: "Événement" },
  { id: "update", label: "Mise à jour" },
  { id: "community", label: "Communauté" },
];

const EMPTY = { title: "", content: "", content_html: "", category: "announce", image_url: "", featured: true, published: true };

export default function NewsAdmin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef(null);

  const uploadCover = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Fichier image uniquement"); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Image max 15 Mo"); return; }
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload/image", fd);
      setForm((f) => ({ ...f, image_url: data.url }));
      toast.success("Image de couverture définie");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Échec upload");
    } finally {
      setUploadingCover(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  const load = async () => {
    try {
      const { data } = await api.get("/admin/news");
      setItems(data);
    } catch {
      toast.error("Erreur de chargement");
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const plain = stripHtml(form.content_html || form.content || "").trim();
    if (!form.title.trim() || plain.length < 2) {
      toast.error("Titre et contenu requis");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: plain,
        content_html: form.content_html || plain,
        category: form.category,
        image_url: form.image_url?.trim() || null,
        featured: form.featured,
        published: form.published,
      };
      if (form.news_id) {
        await api.put(`/admin/news/${form.news_id}`, payload);
        toast.success("Article mis à jour");
      } else {
        await api.post("/admin/news", payload);
        toast.success("Article publié");
      }
      setForm(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Supprimer cet article ?")) return;
    try {
      await api.delete(`/admin/news/${id}`);
      toast.success("Article supprimé");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl" data-testid="news-admin">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-cyan-400" /> Actualités du royaume
          </h2>
          <p className="text-xs text-zinc-500 italic mt-1">
            Rédigez vos articles avec mise en forme (titres, listes, images). Les articles à la une déclenchent une alerte sur le site.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...EMPTY })}
          className="px-4 py-2 rounded-md border border-cyan-500/50 text-cyan-300 font-bold text-sm flex items-center gap-2 hover:shadow-[0_0_18px_rgba(0,229,255,0.25)]"
          data-testid="news-add-btn"
        >
          <Plus className="w-4 h-4" /> Nouvel article
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="rounded-2xl border border-white/10 bg-[#0A0613]/80 p-5 space-y-4">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Titre de l'article"
            maxLength={160}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
            data-testid="news-title-input"
          />
          <HtmlEditor
            value={form.content_html || form.content || ""}
            onChange={(html) => setForm({ ...form, content_html: html, content: stripHtml(html) })}
            label="Contenu de l'article"
            hint="Éditeur complet : titres, tableaux, callouts, images, couleurs"
            minHeight={280}
            variant="article"
            testid="news-content-editor"
          />
          {/* Cover image — URL or upload from PC */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Image de couverture</div>
            <div className="flex gap-2">
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="URL de l'image (ou uploadez depuis votre PC →)"
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={uploadingCover}
                onClick={() => coverFileRef.current?.click()}
                className="px-3 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 text-sm font-bold flex items-center gap-2 hover:bg-cyan-500/10 disabled:opacity-50"
                title="Uploader depuis votre PC"
              >
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {!uploadingCover && <span className="hidden sm:inline">Uploader</span>}
              </button>
              <input
                ref={coverFileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => uploadCover(e.target.files?.[0])}
              />
            </div>
            {form.image_url && (
              <div className="flex items-center gap-2">
                <img src={form.image_url} alt="Aperçu" className="h-20 w-36 object-cover rounded-lg border border-white/10" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_url: "" })}
                  className="p-1.5 text-zinc-500 hover:text-red-400"
                  title="Supprimer l'image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              À la une
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Publié
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setForm(null)} className="px-3 py-1.5 text-sm text-zinc-400">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-md border border-cyan-500/50 text-cyan-300 text-sm font-bold" data-testid="news-save-btn">
              {form.news_id ? "Mettre à jour" : "Publier"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-center py-12 text-zinc-500 italic">Aucun article — créez le premier.</div>
        )}
        {items.map((n) => (
          <div key={n.news_id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex gap-4" data-testid={`news-row-${n.news_id}`}>
            {n.image_url ? (
              <div className="w-24 h-16 rounded-lg bg-cover bg-center shrink-0 border border-white/10" style={{ backgroundImage: `url(${n.image_url})` }} />
            ) : (
              <div className="w-24 h-16 rounded-lg bg-gradient-to-br from-violet-900/40 to-cyan-900/30 shrink-0 border border-white/10" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[9px] uppercase tracking-widest font-bold text-cyan-400">{n.category}</span>
                {n.featured && <Star className="w-3 h-3 text-amber-400" />}
                {!n.published && <span className="text-[9px] text-zinc-500 uppercase">Brouillon</span>}
              </div>
              <div className="font-display font-bold text-sm truncate">{n.title}</div>
              <div className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{n.content}</div>
              <div className="text-[10px] text-zinc-600 mt-1 font-mono-stat">
                {new Date(n.created_at).toLocaleString("fr-FR")} · {n.author}
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setForm({
                  ...EMPTY,
                  ...n,
                  content_html: n.content_html || n.content || "",
                  image_url: n.image_url || "",
                })}
                className="p-1.5 text-zinc-400 hover:text-cyan-300"
                title="Modifier"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.put(`/admin/news/${n.news_id}`, { published: !n.published });
                    load();
                  } catch { toast.error("Erreur"); }
                }}
                className="p-1.5 text-zinc-400 hover:text-white"
                title={n.published ? "Dépublier" : "Publier"}
              >
                {n.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.put(`/admin/news/${n.news_id}`, { featured: !n.featured });
                    load();
                  } catch { toast.error("Erreur"); }
                }}
                className="p-1.5 text-zinc-400 hover:text-amber-300"
                title={n.featured ? "Retirer de la une" : "Mettre à la une"}
              >
                {n.featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => remove(n.news_id)} className="p-1.5 text-zinc-400 hover:text-red-400" title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
