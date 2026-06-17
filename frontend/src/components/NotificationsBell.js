import React, { useEffect, useState, useRef } from "react";
import * as Lucide from "lucide-react";
import { Bell, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";
import { useI18n } from "@/contexts/I18nContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";

// Kinds qui méritent un toast bien visible même quand la cloche est fermée.
const TOAST_KINDS = new Set([
  "friend_request",
  "friend_accepted",
  "friend_message",
  "guild_invite",
  "guild_reward",
  "referral",
]);

export default function NotificationsBell() {
  const { t } = useI18n();
  const ns = useNexusSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifs(data.items);
      setUnread(data.unread);
    } catch {}
  };

  // Chargement initial + rafraîchissement régulier (le socket n'est pas
  // toujours connecté : on garantit ainsi que le compteur reste à jour).
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  // Rafraîchit aussi à chaque retour sur l'onglet.
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // React to socket push notifications
  useEffect(() => {
    if (!ns?.pushNotif) return;
    const doc = ns.pushNotif;
    setNotifs((prev) => [doc, ...prev].slice(0, 50));
    setUnread((u) => u + 1);
    try { sfx.click(); } catch {}
    // Toast visible (en plus du badge) pour les notifications importantes.
    if (doc && TOAST_KINDS.has(doc.kind)) {
      const opts = { duration: 7000 };
      if (doc.link) {
        opts.action = { label: "Voir", onClick: () => navigate(doc.link) };
      }
      toast(doc.title || "Nouvelle notification", { description: doc.message, ...opts });
    }
    ns.consumePushNotif();
  }, [ns?.pushNotif, ns, navigate]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAll = async () => {
    await api.post("/notifications/read-all");
    await load();
  };

  const clearAll = async () => {
    if (!window.confirm("Effacer toutes les notifications définitivement ?")) return;
    await api.delete("/notifications/clear");
    await load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); sfx.click(); }}
        data-testid="notif-bell-btn"
        className="relative w-9 h-9 rounded-md border border-white/10 hover:border-cyan-500/40 flex items-center justify-center transition-all"
      >
        <Bell className={`w-4 h-4 ${unread > 0 ? "text-amber-300" : "text-zinc-300"}`} />
        {unread > 0 && (
          <>
            <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-red-500/60 animate-ping" aria-hidden />
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.7)] ring-2 ring-[#0b0712]"
              data-testid="notif-unread-count"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-80 max-w-[90vw] glass glass-cyan rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
            data-testid="notif-dropdown"
          >
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold font-display">{t("notif.title")}</div>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button onClick={markAll} className="text-xs text-cyan-400 hover:text-cyan-300" data-testid="notif-mark-all">
                    <Check className="w-3 h-3 inline mr-1" /> {t("notif.mark_all")}
                  </button>
                )}
                {notifs.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300" data-testid="notif-clear-all">
                    <Trash2 className="w-3 h-3 inline mr-1" /> Effacer tout
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifs.length === 0 && (
                <div className="py-8 text-center text-sm text-zinc-500 italic">{t("notif.empty")}</div>
              )}
              {notifs.map((n) => {
                const Icon = Lucide[n.icon] || Lucide.Bell;
                const clickable = !!n.link;
                const go = () => {
                  if (!n.link) return;
                  setOpen(false);
                  navigate(n.link);
                };
                return (
                  <div
                    key={n.notif_id}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={go}
                    onKeyDown={(e) => { if (clickable && (e.key === "Enter" || e.key === " ")) go(); }}
                    className={`px-4 py-3 border-b border-white/5 last:border-0 ${!n.read ? "bg-cyan-500/5" : ""} ${clickable ? "cursor-pointer hover:bg-cyan-500/10" : ""}`}
                    data-testid={`notif-${n.notif_id}`}
                  >
                    <div className="flex gap-3">
                      <Icon className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-sm">{n.title}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{n.message}</div>
                        <div className="text-[10px] font-mono-stat text-zinc-600 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
