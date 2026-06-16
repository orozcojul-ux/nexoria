import React, { useState } from "react";
import { Scroll, VolumeX, Volume2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { PremiumButton } from "@/components/ui-premium";

/** Modération forum — distincte du ban site (Conseil / admin). */
export default function ForumModPanel({ targetUser, onDone }) {
  const [open, setOpen] = useState(null);
  const [hours, setHours] = useState(24);
  const [reason, setReason] = useState("Comportement inapproprié sur le forum");
  const [loading, setLoading] = useState(false);

  if (!targetUser?.user_id) return null;

  const isForumBanned =
    targetUser.forum_banned_until && new Date(targetUser.forum_banned_until) > new Date();
  const isMuted =
    !isForumBanned &&
    targetUser.forum_muted_until &&
    new Date(targetUser.forum_muted_until) > new Date();

  const run = async (action) => {
    setLoading(true);
    try {
      if (action === "forum-ban") {
        await api.post(`/forum/moderation/ban/${targetUser.user_id}`, { duration_hours: hours, reason });
        toast.success(`${targetUser.username} exclu de la Tribune (${hours}h)`);
      } else if (action === "forum-unban") {
        await api.post(`/forum/moderation/unban/${targetUser.user_id}`);
        toast.success("Exclusion forum levée");
      } else if (action === "mute") {
        await api.post(`/forum/moderation/mute/${targetUser.user_id}`, { duration_hours: hours, reason });
        toast.success(`${targetUser.username} en mute forum (${hours}h)`);
      } else if (action === "unmute") {
        await api.post(`/forum/moderation/unmute/${targetUser.user_id}`);
        toast.success("Mute forum levé");
      }
      setOpen(null);
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center" data-testid="forum-mod-panel">
      <span className="text-[9px] uppercase tracking-widest text-zinc-600 w-full sm:w-auto">Modération forum</span>

      {isForumBanned ? (
        <PremiumButton variant="gold" size="sm" icon={ShieldOff} onClick={() => run("forum-unban")} disabled={loading} testid="forum-mod-unban">
          Lever exclusion
        </PremiumButton>
      ) : (
        <PremiumButton variant="gold" size="sm" icon={Scroll} onClick={() => setOpen(open === "forum-ban" ? null : "forum-ban")} testid="forum-mod-ban">
          Exclure de la Tribune
        </PremiumButton>
      )}

      {!isForumBanned && (
        isMuted ? (
          <PremiumButton variant="ghost" size="sm" icon={Volume2} onClick={() => run("unmute")} disabled={loading} testid="forum-mod-unmute">
            Lever mute
          </PremiumButton>
        ) : (
          <PremiumButton variant="ghost" size="sm" icon={VolumeX} onClick={() => setOpen(open === "mute" ? null : "mute")} testid="forum-mod-mute">
            Mute (lecture seule)
          </PremiumButton>
        )
      )}

      {open && (
        <div className="w-full flex flex-wrap gap-2 items-end p-3 rounded-lg border border-amber-500/25 bg-amber-500/5">
          <p className="w-full text-[10px] text-amber-200/80 italic mb-1">
            {open === "forum-ban"
              ? "Exclusion forum : bloque l'accès à la Tribune. Le reste du site reste accessible."
              : "Mute forum : l'utilisateur peut lire mais ne peut plus publier."}
          </p>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Durée (h)</label>
            <input
              type="number"
              min={1}
              max={720}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-20 bg-[#0A0A0E] border border-white/10 rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Motif</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded px-2 py-1 text-sm"
            />
          </div>
          <PremiumButton
            variant="gold"
            size="sm"
            disabled={loading}
            onClick={() => run(open === "forum-ban" ? "forum-ban" : "mute")}
            testid="forum-mod-confirm"
          >
            Confirmer
          </PremiumButton>
        </div>
      )}
    </div>
  );
}
