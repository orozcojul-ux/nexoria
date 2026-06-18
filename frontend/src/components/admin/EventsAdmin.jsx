import React, { useEffect, useState } from "react";
import { Calendar, Plus, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const EMPTY = {
  name: "",
  description: "",
  starts_at: "",
  ends_at: "",
  icon: "Calendar",
  color: "#7C3AED",
  reward_xp: 0,
  reward_aether: 0,
};

const ICONS = ["Calendar", "Flame", "Sparkles", "Trophy", "Sword", "Crown", "Star", "Zap", "Globe2", "Skull"];

function toLocalInput(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}

function toISO(local) {
  if (!local) return null;
  try { return new Date(local).toISOString(); } catch { return null; }
}

export default function EventsAdmin() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/events");
      setEvents(data || []);
    } catch { toast.error("Erreur de chargement"); }
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.starts_at) {
      toast.error("Nom et date de début requis");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        starts_at: toISO(form.starts_at),
        ends_at: toISO(form.ends_at) || null,
        reward_xp: Number(form.reward_xp) || 0,
        reward_aether: Number(form.reward_aether) || 0,
      };
      if (form.event_id) {
        await api.put(`/admin/events/${form.event_id}`, payload);
        toast.success("Événement modifié");
      } else {
        await api.post("/admin/events", payload);
        toast.success("Événement créé");
      }
      setForm(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (event_id) => {
    if (!window.confirm("Supprimer cet événement ?")) return;
    try {
      await api.delete(`/admin/events/${event_id}`);
      toast.success("Événement supprimé");
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-6 max-w-4xl" data-testid="events-admin">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" /> Calendrier des Événements
          </h2>
          <p className="text-xs text-zinc-500 italic mt-1">Programmez et gérez les événements affichés sur la page Événements.</p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...EMPTY })}
          className="px-4 py-2 rounded-md border border-violet-500/50 text-violet-300 font-bold text-sm flex items-center gap-2 hover:shadow-[0_0_18px_rgba(167,139,250,0.25)]"
          data-testid="events-add-btn"
        >
          <Plus className="w-4 h-4" /> Nouvel événement
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="rounded-2xl border border-white/10 bg-[#0A0613]/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg">{form.event_id ? "Modifier" : "Créer"} un événement</h3>
            <button type="button" onClick={() => setForm(null)}><X className="w-4 h-4 text-zinc-500 hover:text-white" /></button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Nom *</label>
              <input
                value={form.name} required maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                placeholder="Tournoi Saisonnier…"
                data-testid="event-name-input"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Icône</label>
              <select
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Description</label>
            <textarea
              value={form.description} maxLength={500} rows={3}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Description de l'événement…"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Début *</label>
              <input
                type="datetime-local" required
                value={toLocalInput(form.starts_at) || form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                data-testid="event-starts-input"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Fin (optionnel)</label>
              <input
                type="datetime-local"
                value={toLocalInput(form.ends_at) || form.ends_at || ""}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Couleur</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                <span className="text-xs text-zinc-400 font-mono">{form.color}</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Récompense XP</label>
              <input
                type="number" min={0} max={10000}
                value={form.reward_xp}
                onChange={(e) => setForm({ ...form, reward_xp: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Récompense Écus</label>
              <input
                type="number" min={0} max={10000}
                value={form.reward_aether}
                onChange={(e) => setForm({ ...form, reward_aether: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setForm(null)} className="px-3 py-1.5 text-sm text-zinc-400">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-md border border-violet-500/50 text-violet-300 text-sm font-bold flex items-center gap-2 disabled:opacity-50" data-testid="event-save-btn">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {form.event_id ? "Mettre à jour" : "Créer l'événement"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {events.length === 0 && (
          <div className="text-center py-12 text-zinc-500 italic">Aucun événement programmé — créez le premier.</div>
        )}
        {events.map((ev) => (
          <div key={ev.event_id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex gap-4 items-start" data-testid={`event-row-${ev.event_id}`}>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
              style={{ background: `${ev.color || "#7C3AED"}25`, border: `1px solid ${ev.color || "#7C3AED"}50` }}
            >
              📅
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-sm text-white">{ev.name}</div>
              {ev.description && <div className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{ev.description}</div>}
              <div className="flex items-center gap-3 mt-1 text-[10px] font-mono-stat text-zinc-500">
                <span>🟢 {fmt(ev.starts_at)}</span>
                {ev.ends_at && <span>🔴 {fmt(ev.ends_at)}</span>}
                {(ev.reward_xp > 0 || ev.reward_aether > 0) && (
                  <span className="text-amber-400">
                    {ev.reward_xp > 0 ? `+${ev.reward_xp} XP` : ""}{ev.reward_xp > 0 && ev.reward_aether > 0 ? " · " : ""}{ev.reward_aether > 0 ? `+${ev.reward_aether} Écus` : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setForm({ ...ev, starts_at: toLocalInput(ev.starts_at), ends_at: toLocalInput(ev.ends_at) })}
                className="p-1.5 text-zinc-400 hover:text-violet-300"
                title="Modifier"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => remove(ev.event_id)} className="p-1.5 text-zinc-400 hover:text-red-400" title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
