import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sword, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Particles from "@/components/Particles";
import { sfx } from "@/lib/sfx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      sfx.success();
      toast.success(`Bon retour, ${data.username}`);
      navigate("/feed");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setLoading(false); }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/feed";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#030305] flex items-center justify-center px-4 relative overflow-hidden">
      <Particles density={50} color="rgba(157,76,221,0.4)" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-transparent to-cyan-900/10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-2 justify-center mb-8" data-testid="login-logo">
          <img src="/logo.png" alt="NEXORIA" className="w-9 h-9 object-contain" style={{filter:"drop-shadow(0 0 10px rgba(157,76,221,0.7))"}}/>
          <span className="font-display font-black text-2xl text-gradient">NEXORIA</span>
        </Link>

        <div className="glass glass-cyan rounded-2xl p-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Portail du Héros</div>
          <h1 className="font-display font-black text-3xl mb-1">Connexion</h1>
          <p className="text-sm text-zinc-400 mb-8">Reprenez le contrôle de votre destin.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_12px_rgba(0,229,255,0.15)] transition-all"
                data-testid="login-email-input"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_12px_rgba(0,229,255,0.15)] transition-all"
                data-testid="login-password-input"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md bg-[#0A0A0E] border border-cyan-500/50 text-cyan-300 font-bold hover:border-cyan-400 hover:shadow-[0_0_24px_rgba(0,229,255,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="login-submit-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrer dans NEXORIA <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">ou</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <button
            onClick={googleLogin}
            className="w-full py-3 rounded-md bg-[#0A0A0E] border border-white/10 hover:border-violet-500/50 transition-all flex items-center justify-center gap-3 text-sm text-zinc-200"
            data-testid="login-google-btn"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuer avec Google
          </button>

          <button
            onClick={async () => {
              try { const { data } = await api.get("/auth/discord/url"); window.location.href = data.url; }
              catch { toast.error("Discord OAuth non configuré"); }
            }}
            className="mt-2 w-full py-3 rounded-md bg-[#0A0A0E] border border-white/10 hover:border-indigo-500/50 transition-all flex items-center justify-center gap-3 text-sm text-zinc-200"
            data-testid="login-discord-btn"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            Continuer avec Discord
          </button>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Pas encore de héros ?{" "}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold" data-testid="login-to-register">
              Forger mon personnage
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
