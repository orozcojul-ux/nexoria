import React, { useEffect, useRef, useState } from "react";
import { Shield, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { setToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumButton, PremiumModal } from "@/components/ui-premium";

// Discord brand SVG
function DiscordIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );
}

export default function MaintenanceStaffGate() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [error, setError] = useState("");
  const oauthWindowRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Listen for the OAuth code coming back from the Discord popup
  useEffect(() => {
    const onMessage = async (event) => {
      if (event.data?.type !== "discord_oauth_code") return;
      const code = event.data.code;
      if (!code) return;
      setDiscordLoading(true);
      setError("");
      try {
        const { data } = await api.post("/staff/maintenance-discord-callback", { code });
        if (data.session_token) setToken(data.session_token);
        setUser(data);
        toast.success(`Bienvenue, Sentinelle ${data.username}`);
        navigate("/feed");
      } catch (err) {
        const msg = err?.response?.data?.detail || "Accès refusé";
        setError(typeof msg === "string" ? msg : "Accès refusé — compte Discord non lié ou non staff");
      } finally {
        setDiscordLoading(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setUser, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/staff/maintenance-login", { email, password });
      if (data.session_token) setToken(data.session_token);
      setUser(data);
      toast.success(`Bienvenue, ${data.username}`);
      if (data.role === "admin" || data.role === "moderator") {
        navigate("/feed");
      } else {
        setError("Accès refusé — réservé aux Sentinelles");
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || "Accès refusé";
      setError(typeof msg === "string" ? msg : "Accès refusé");
    } finally {
      setLoading(false);
    }
  };

  const loginWithDiscord = async () => {
    setError("");
    try {
      const { data } = await api.get("/auth/discord/url");
      if (!data?.url) { setError("OAuth Discord indisponible"); return; }
      // Open OAuth in a small popup
      const w = 500, h = 700;
      const left = Math.max(0, (window.screen.width - w) / 2);
      const top = Math.max(0, (window.screen.height - h) / 2);
      oauthWindowRef.current = window.open(
        data.url,
        "discord_oauth",
        `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,location=0`
      );
    } catch {
      setError("Impossible d'ouvrir la fenêtre Discord");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="maint-secret-rune"
        aria-label="Rune"
        title=""
        data-testid="secret-rune"
      />

      <PremiumModal
        open={open}
        onClose={() => { setOpen(false); setError(""); }}
        title="Accès Sentinelle"
        icon={Shield}
        maxWidth="max-w-md"
        testid="staff-sentinel-modal"
      >
        <div className="p-5 space-y-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold">
            Connexion staff uniquement
          </p>

          {/* Discord login */}
          <button
            type="button"
            onClick={loginWithDiscord}
            disabled={discordLoading || loading}
            data-testid="staff-discord-btn"
            className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#5865F2,#404EED)", color: "#fff" }}
          >
            <DiscordIcon className="w-4 h-4" />
            {discordLoading ? "Connexion Discord…" : "Se connecter via Discord"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email / password login */}
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0A0613] border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                placeholder="sentinelle@nexoria.com"
                data-testid="staff-email"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0A0613] border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                data-testid="staff-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400" data-testid="staff-login-error">{error}</p>
            )}
            <PremiumButton type="submit" variant="gold" size="md" className="w-full" disabled={loading || discordLoading} testid="staff-submit">
              {loading ? "Connexion…" : "Se connecter"}
            </PremiumButton>
          </form>
        </div>
      </PremiumModal>
    </>
  );
}
