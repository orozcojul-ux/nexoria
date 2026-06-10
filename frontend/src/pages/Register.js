import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sword, ArrowRight, Loader2, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Particles from "@/components/Particles";
import { sfx } from "@/lib/sfx";

export default function Register() {
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ email: "", username: "", password: "", class_id: null });
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/game/classes").then((r) => setClasses(r.data)).catch(() => {});
  }, []);

  const Icon = (name) => LucideIcons[name] || LucideIcons.Sparkles;

  const next = () => {
    if (step === 1 && (!form.email || !form.username || form.password.length < 6)) {
      toast.error("Vérifiez vos informations (mot de passe ≥ 6 caractères)");
      return;
    }
    sfx.click();
    setStep(step + 1);
  };

  const submit = async () => {
    if (!form.class_id) { toast.error("Choisissez une classe"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setUser(data);
      sfx.levelUp();
      toast.success(`Bienvenue ${data.username}, ${data.class_name}`);
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
    <div className="min-h-screen bg-[#030305] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <Particles density={60} color="rgba(0,229,255,0.4)" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-4xl">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8" data-testid="register-logo">
          <Sword className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
          <span className="font-display font-black text-2xl text-gradient">NEXORIA</span>
        </Link>

        <div className="glass glass-violet rounded-2xl p-6 sm:p-10">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className={`h-1 w-16 rounded-full ${step >= s ? "bg-gradient-to-r from-violet-500 to-cyan-400" : "bg-white/10"}`} />
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2 text-center">Étape 1/2 · Identité</div>
              <h1 className="font-display font-black text-3xl mb-1 text-center">Forger votre Héros</h1>
              <p className="text-sm text-zinc-400 mb-8 text-center">Commencez par votre identité dans NEXORIA.</p>

              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Email</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                    data-testid="register-email-input"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Pseudo de héros</label>
                  <input
                    type="text" required minLength={3} maxLength={20} value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, "") })}
                    className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-all font-mono-stat"
                    data-testid="register-username-input"
                    placeholder="Arkanis"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Mot de passe</label>
                  <input
                    type="password" required minLength={6} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                    data-testid="register-password-input"
                  />
                </div>
                <button onClick={next} className="w-full py-3 rounded-md bg-[#0A0A0E] border border-cyan-500/50 text-cyan-300 font-bold hover:shadow-[0_0_24px_rgba(0,229,255,0.4)] transition-all flex items-center justify-center gap-2" data-testid="register-next-btn">
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>

                <div className="my-2 flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">ou</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <button onClick={googleLogin} className="w-full py-3 rounded-md border border-white/10 hover:border-violet-500/40 text-sm text-zinc-200 flex items-center justify-center gap-3" data-testid="register-google-btn">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continuer avec Google
                </button>
                <p className="text-center text-sm text-zinc-400 pt-2">
                  Déjà un compte ? <Link to="/login" className="text-cyan-400" data-testid="register-to-login">Se connecter</Link>
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2 text-center">Étape 2/2 · Voie</div>
              <h1 className="font-display font-black text-3xl mb-1 text-center">Choisissez votre <span className="text-gradient">Classe</span></h1>
              <p className="text-sm text-zinc-400 mb-8 text-center">Chaque classe débloque des bonus, badges et une histoire unique.</p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                {classes.map((c) => {
                  const I = Icon(c.icon);
                  const selected = form.class_id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setForm({ ...form, class_id: c.id }); sfx.click(); }}
                      className={`relative glass rounded-xl p-4 text-left transition-all hover:scale-[1.02] ${selected ? "border-cyan-500/60 shadow-[0_0_20px_rgba(0,229,255,0.3)]" : "hover:border-white/20"}`}
                      style={selected ? { borderColor: c.color, boxShadow: `0 0 20px ${c.color}50` } : {}}
                      data-testid={`class-card-${c.id}`}
                    >
                      {selected && <Check className="absolute top-2 right-2 w-4 h-4 text-cyan-400" />}
                      <I className="w-6 h-6 mb-3" style={{ color: c.color, filter: `drop-shadow(0 0 8px ${c.color}aa)` }} />
                      <div className="font-display font-bold text-sm">{c.name}</div>
                      <div className="text-[10px] text-zinc-400 mt-1 leading-snug line-clamp-2">{c.tagline}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 justify-center">
                <button onClick={() => setStep(1)} className="px-6 py-3 rounded-md border border-white/10 text-zinc-300 hover:border-white/30 text-sm" data-testid="register-back-btn">
                  Retour
                </button>
                <button
                  onClick={submit}
                  disabled={loading || !form.class_id}
                  className="px-6 py-3 rounded-md bg-[#0A0A0E] border border-cyan-500/50 text-cyan-300 font-bold hover:shadow-[0_0_24px_rgba(0,229,255,0.4)] transition-all disabled:opacity-40 flex items-center gap-2"
                  data-testid="register-submit-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Naître à NEXORIA <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
