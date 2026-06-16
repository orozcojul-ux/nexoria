import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Castle, Check, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";

/**
 * Pop-up globale qui interpelle le joueur dès qu'il a des invitations
 * d'ordre (guilde) en attente — visible sur toutes les pages.
 * Affiche le nom de l'ordre et permet d'accepter ou refuser.
 */
export default function GuildInvitePrompt() {
  const { user, refresh } = useAuth();
  const ns = useNexusSocket();
  const [invites, setInvites] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchInvites = useCallback(async () => {
    try {
      const { data } = await api.get("/guilds/invites/mine");
      setInvites(Array.isArray(data) ? data : []);
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    if (user) fetchInvites();
  }, [user, fetchInvites]);

  // Temps réel : une nouvelle invitation arrive → réafficher la pop-up
  useEffect(() => {
    if (ns?.pushNotif?.kind === "guild_invite") {
      setDismissed(false);
      fetchInvites();
    }
  }, [ns?.pushNotif, fetchInvites]);

  const accept = async (inv) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/guilds/invites/${inv.invite_id}/accept`);
      toast.success(`Vous avez rejoint « ${inv.guild?.name || "l'ordre"} » !`);
      try { sfx.success(); } catch {}
      await refresh?.();
      await fetchInvites();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const decline = async (inv) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/guilds/invites/${inv.invite_id}/decline`);
      toast(`Invitation de « ${inv.guild?.name || "l'ordre"} » refusée.`);
      await fetchInvites();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  if (!user || dismissed || invites.length === 0) return null;

  const inv = invites[0];
  const guild = inv.guild || {};
  const accent = guild.banner_color || "#c8960a";

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(4,4,12,0.72)",
        backdropFilter: "blur(4px)",
      }}
      data-testid="guild-invite-prompt"
      role="dialog"
      aria-modal="true"
      aria-label="Invitation à rejoindre un ordre"
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          borderRadius: 14,
          border: "2px solid #c8960a",
          background: "linear-gradient(180deg, rgba(20,16,36,0.98) 0%, rgba(10,8,22,0.99) 100%)",
          boxShadow: "0 0 0 1px rgba(100,70,0,0.5), 0 0 50px rgba(124,58,237,0.28), inset 0 0 40px rgba(0,0,0,0.6)",
          padding: "26px 24px 22px",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Plus tard"
          style={{
            position: "absolute", top: 10, right: 10,
            width: 30, height: 30, borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)", color: "#9a93b5",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <X className="w-4 h-4" />
        </button>

        <div
          style={{
            width: 64, height: 64, margin: "0 auto 14px",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `radial-gradient(circle, ${accent}33 0%, transparent 72%)`,
            border: `2px solid ${accent}`,
            boxShadow: `0 0 24px ${accent}55`,
          }}
        >
          {guild.emblem_url ? (
            <img src={guild.emblem_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <Castle className="w-7 h-7" style={{ color: accent }} />
          )}
        </div>

        <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8a83a8", fontWeight: 700 }}>
          Invitation à un Ordre
        </div>

        <h2
          style={{
            margin: "8px 0 2px",
            fontFamily: '"Cinzel", serif',
            fontWeight: 700,
            fontSize: 24,
            color: "#f5e6c0",
            textShadow: "0 0 16px rgba(200,150,10,0.4)",
          }}
        >
          {guild.name || "Un ordre"}{" "}
          {guild.tag && <span style={{ color: "#7a7aaa", fontSize: 16 }}>[{guild.tag}]</span>}
        </h2>

        <p style={{ color: "#b8b2cf", fontSize: 13, margin: "8px 0 4px", fontStyle: "italic" }}>
          {guild.description || "Cet ordre souhaite vous compter parmi ses rangs."}
        </p>
        <p style={{ color: "#6f6a8a", fontSize: 12, margin: "0 0 18px" }}>
          Souhaitez-vous rejoindre cet ordre&nbsp;?
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => decline(inv)}
            disabled={busy}
            data-testid="prompt-decline"
            style={{
              flex: 1, maxWidth: 170,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "11px 18px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)", color: "#c8c2dd",
              fontWeight: 700, fontSize: 14, cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <X className="w-4 h-4" /> Refuser
          </button>
          <button
            type="button"
            onClick={() => accept(inv)}
            disabled={busy}
            data-testid="prompt-accept"
            style={{
              flex: 1, maxWidth: 170,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "11px 18px", borderRadius: 8,
              border: "2px solid #c8960a",
              background: "linear-gradient(180deg, rgba(200,150,20,0.35), rgba(150,100,15,0.5))",
              color: "#fff5cf",
              fontWeight: 800, fontSize: 14, cursor: busy ? "default" : "pointer",
              boxShadow: "0 0 24px rgba(200,150,10,0.35)",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Check className="w-4 h-4" /> Accepter
          </button>
        </div>

        {invites.length > 1 && (
          <div style={{ marginTop: 14, fontSize: 11, color: "#6f6a8a" }}>
            + {invites.length - 1} autre{invites.length - 1 > 1 ? "s" : ""} invitation{invites.length - 1 > 1 ? "s" : ""} en attente
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
