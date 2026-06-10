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
          <Sword className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
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
