import React, { useEffect, useState } from "react";
import { Headphones, Plus, ChevronLeft, Send, Clock, LifeBuoy, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import TranslatableText from "@/components/content/TranslatableText";
import TranslatableContent from "@/components/content/TranslatableContent";
import { translateApiError } from "@/lib/i18n-api";
import HeroName from "@/components/HeroName";
import { sfx } from "@/lib/sfx";
import {
  PageShell,
  PremiumCard,
  PremiumButton,
  PremiumModal,
} from "@/components/ui-premium";
import { usePageBanner } from "@/lib/page-banners";

const STATUS_COLOR = { open: "#3B82F6", in_progress: "#EAB308", resolved: "#10B981", closed: "#71717A" };
const CATEGORY_IDS = ["general", "bug", "account", "other"];
const STATUS_IDS = ["open", "in_progress", "resolved", "closed"];

const statusLabel = (t, status) => t(`tickets.status.${status}`);
const categoryLabel = (t, category) => t(`tickets.cat.${category}`, category);

export default function Tickets() {
  const { t, fmtDate } = useI18n();
  const banner = usePageBanner("tickets");
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const { data } = await api.get("/tickets/mine");
    setTickets(data);
  };
  useEffect(() => { load(); }, []);

  const openCount = tickets.filter((tk) => tk.status === "open" || tk.status === "in_progress").length;

  if (selected) return <TicketView ticketId={selected} onBack={() => { setSelected(null); load(); }} />;

  return (
    <PageShell
      wide
      testid="tickets-page"
      banner={banner}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          <span className="hub-stat-pill"><MessageSquare className="w-3 h-3" /> {t("tickets.count", { count: tickets.length })}</span>
          <span className="hub-stat-pill"><LifeBuoy className="w-3 h-3 text-blue-400" /> {t("tickets.inProgress", { count: openCount })}</span>
        </div>
        <PremiumButton variant="cyan" size="sm" icon={Plus} onClick={() => setShowCreate(true)} testid="open-create-ticket">
          {t("tickets.new")}
        </PremiumButton>
      </div>

      <div className="ticket-layout ticket-layout--list-only">
        <aside className="space-y-2">
          {tickets.length === 0 ? (
            <PremiumCard tone="cyan" className="text-center text-zinc-500 py-12">
              <Headphones className="w-10 h-10 mx-auto mb-3 text-cyan-500/40" />
              <p className="italic text-sm">{t("tickets.empty")}</p>
              <p className="text-xs text-zinc-600 mt-2">{t("tickets.emptyHint")}</p>
            </PremiumCard>
          ) : (
            tickets.map((tk) => (
              <button
                key={tk.ticket_id}
                onClick={() => setSelected(tk.ticket_id)}
                data-testid={`ticket-${tk.ticket_id}`}
                className="w-full text-left rounded-xl border border-white/8 bg-black/25 hover:border-cyan-500/25 hover:bg-cyan-500/5 transition-all p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-sm text-white truncate">
                      <TranslatableText
                        text={tk.subject}
                        entityType="ticket"
                        entityId={tk.ticket_id}
                        field="subject"
                        compact
                      />
                    </div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3" /> {fmtDate(tk.updated_at)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-600 mt-1">
                      {categoryLabel(t, tk.category)}
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold shrink-0"
                    style={{ background: `${STATUS_COLOR[tk.status]}20`, color: STATUS_COLOR[tk.status] }}
                  >
                    {statusLabel(t, tk.status)}
                  </span>
                </div>
              </button>
            ))
          )}
        </aside>
      </div>

      <PremiumModal open={showCreate} onClose={() => setShowCreate(false)} title={t("tickets.createTitle")} testid="create-ticket-dialog">
        <CreateTicketForm onClose={() => setShowCreate(false)} onCreated={async () => { setShowCreate(false); await load(); }} />
      </PremiumModal>
    </PageShell>
  );
}

function CreateTicketForm({ onClose, onCreated }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ subject: "", body: "", category: "general" });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/tickets", form);
      toast.success(t("tickets.sent"));
      sfx.success();
      await onCreated();
    } catch (err) { toast.error(translateApiError(t, err, "errors.generic")); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="p-5 space-y-3">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{t("tickets.category")}</label>
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="ticket-category">
          {CATEGORY_IDS.map((id) => (
            <option key={id} value={id}>{categoryLabel(t, id)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{t("tickets.subject")}</label>
        <input value={form.subject} required minLength={5} maxLength={150} placeholder={t("tickets.subjectPlaceholder")}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="ticket-subject" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{t("tickets.message")}</label>
        <textarea value={form.body} required minLength={10} maxLength={3000} rows={6}
          placeholder={t("tickets.bodyPlaceholder")} onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="ticket-body" />
      </div>
      <PremiumButton type="submit" variant="cyan" size="sm" disabled={saving} className="w-full" testid="ticket-submit">
        {saving ? t("common.sending") : t("tickets.submit")}
      </PremiumButton>
    </form>
  );
}

function TicketView({ ticketId, onBack }) {
  const { t, fmtDate } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const load = async () => {
    const { data: d } = await api.get(`/tickets/${ticketId}`);
    setData(d);
  };
  useEffect(() => { load(); }, [ticketId]);

  const reply = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api.post(`/tickets/${ticketId}/replies`, { content: text.trim() });
    setText("");
    load();
  };
  const setStatus = async (status) => {
    await api.put(`/tickets/${ticketId}/status`, { status });
    toast.success(t("tickets.statusChanged", { status: statusLabel(t, status) }));
    load();
  };

  if (!data) {
    return (
      <PageShell testid="ticket-view">
        <PremiumCard tone="cyan" className="p-12 text-center text-zinc-500">{t("tickets.loading")}</PremiumCard>
      </PageShell>
    );
  }

  const ticket = data.ticket;
  return (
    <PageShell wide testid="ticket-view">
      <PremiumButton variant="ghost" size="sm" icon={ChevronLeft} onClick={onBack} testid="ticket-back" className="mb-4">
        {t("tickets.myTickets")}
      </PremiumButton>

      <div className="hub-page-header mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">{categoryLabel(t, ticket.category)}</div>
            <h1 className="font-display font-black text-xl text-white mt-0.5">
              <TranslatableText
                text={ticket.subject}
                entityType="ticket"
                entityId={ticket.ticket_id}
                field="subject"
              />
            </h1>
            <div className="text-xs text-zinc-500 mt-1"><HeroName user={ticket.author} size="sm" /> · {fmtDate(ticket.created_at)}</div>
          </div>
          <span className="px-2.5 py-1 rounded text-[10px] uppercase tracking-widest font-bold"
            style={{ background: `${STATUS_COLOR[ticket.status]}20`, color: STATUS_COLOR[ticket.status] }}>
            {statusLabel(t, ticket.status)}
          </span>
        </div>
      </div>

      <PremiumCard tone="cyan" className="p-4 mb-4">
        <TranslatableContent
          plain={ticket.body}
          entityType="ticket"
          entityId={ticket.ticket_id}
          field="body"
          className="text-zinc-200 whitespace-pre-wrap text-sm leading-relaxed"
        />
        {isStaff && (
          <div className="flex gap-1 mt-4 flex-wrap border-t border-white/5 pt-3" data-testid="ticket-status-actions">
            {STATUS_IDS.map((s) => (
              <PremiumButton key={s} variant="ghost" size="sm" onClick={() => setStatus(s)} disabled={ticket.status === s} testid={`status-${s}`}>
                {statusLabel(t, s)}
              </PremiumButton>
            ))}
          </div>
        )}
      </PremiumCard>

      <div className="space-y-2 mb-4" data-testid="ticket-replies">
        {data.replies.map((r) => (
          <PremiumCard key={r.reply_id} tone={r.is_staff ? "violet" : "cyan"} testid={`treply-${r.reply_id}`}>
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-2">
              <HeroName user={r.author} size="sm" /> · {fmtDate(r.created_at)}
              {r.is_staff && <span className="text-[9px] uppercase font-bold text-violet-300 px-1.5 py-0.5 rounded bg-violet-500/15">{t("tickets.support")}</span>}
            </div>
            <TranslatableContent
              plain={r.content}
              entityType="ticket_reply"
              entityId={r.reply_id}
              field="content"
              className="text-zinc-200 whitespace-pre-wrap text-sm"
            />
          </PremiumCard>
        ))}
      </div>

      {ticket.status !== "closed" && (
        <PremiumCard tone="cyan" className="p-4">
          <form onSubmit={reply} className="space-y-2" data-testid="ticket-reply-form">
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("tickets.replyPlaceholder")} rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="ticket-reply-input" />
            <div className="flex items-center gap-2 flex-wrap">
              <PremiumButton type="submit" variant="cyan" size="sm" icon={Send} testid="ticket-reply-submit">
                {t("tickets.send")}
              </PremiumButton>
              {!isStaff && (ticket.status === "in_progress" || ticket.status === "open") && (
                <PremiumButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatus("resolved")}
                  testid="ticket-resolve-btn"
                >
                  ✅ {t("tickets.markResolved")}
                </PremiumButton>
              )}
            </div>
          </form>
        </PremiumCard>
      )}
    </PageShell>
  );
}
