import React, { useEffect, useState } from "react";
import { Construction, Sparkles, Lock, ArrowRight, Hammer } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import Logo from "@/components/Logo";
import Particles from "@/components/Particles";
import StarField from "@/components/StarField";
import { RuneDivider } from "@/components/Ornaments";

export default function Maintenance() {
  const { t } = useI18n();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [maintenance, setMaintenance] = useState(null);
  const [showStaff, setShowStaff] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/system/maintenance").then((r) => setMaintenance(r.data));
    const id = setInterval(() => api.get("/system/maintenance").then((r) => {
      setMaintenance(r.data);
      if (!r.data.enabled) navigate("/feed");
    }).catch(() => {}), 15000);
    return () => clearInterval(id);
  }, [navigate]);

  const staffLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.role !== "admin" && data.role !== "moderator") {
        toast.error("Accès staff requis");
        setLoading(false);
        return;
      }
      setUser(data);
      navigate("/admin");
    } catch (err) {
      toast.error("Identifiants invalides");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#030305] text-white relative overflow-hidden flex items-center justify-center p-4">
      <StarField density={150} />
      <Particles density={50} color="rgba(157,76,221,0.5)" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
        className="relative z-10 max-w-2xl w-full text-center">

        {/* Logo */}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}>
          <img
            src="/logo.png"
            alt="NEXORIA"
            className="w-44 h-44 sm:w-56 sm:h-56 mx-auto object-contain mb-6 animate-float"
            style={{ filter: "drop-shadow(0 0 40px rgba(157,76,221,0.6)) drop-shadow(0 0 20px rgba(0,229,255,0.5))" }}
            data-testid="maintenance-logo"
          />
        </motion.div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/5 mb-4">
          <Construction className="w-3 h-3 text-yellow-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-bold">État du Royaume</span>
        </div>

        <h1 className="font-display font-black text-4xl sm:text-6xl tracking-tighter mb-3 eldritch-glow">
          {t("maintenance.title")}
        </h1>
        <p className="text-zinc-400 text-base sm:text-lg italic scroll-paragraph max-w-xl mx-auto">
          {maintenance?.message || t("maintenance.subtitle")}
        </p>

        <RuneDivider className="my-8 max-w-md mx-auto" />

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono-stat mb-8">
          <Hammer className="w-3 h-3 animate-pulse" />
          <span>Les forgerons œuvrent dans l'ombre — re-vérification automatique toutes les 15s</span>
        </div>

        {!showStaff ? (
          <button
            onClick={() => setShowStaff(true)}
            data-testid="staff-access-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-violet-500/30 text-violet-300 hover:border-violet-500/60 hover:shadow-[0_0_20px_rgba(157,76,221,0.3)] text-sm font-display font-bold tracking-wide transition-all"
          >
            <Lock className="w-3 h-3" /> {t("maintenance.staff")}
          </button>
        ) : (
          <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onSubmit={staffLogin} className="glass glass-violet rounded-2xl p-6 max-w-sm mx-auto space-y-3 text-left" data-testid="staff-form">
            <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold font-display text-center mb-3">{t("maintenance.staff")}</div>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.email")}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500/60"
              data-testid="staff-email"
            />
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.password")}
              className="w-full bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500/60"
              data-testid="staff-password"
            />
            <button type="submit" disabled={loading}
              className="w-full py-2 rounded-md border border-violet-500/50 text-violet-300 font-display font-bold hover:shadow-[0_0_20px_rgba(157,76,221,0.4)] disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
              data-testid="staff-submit">
              Pénétrer le Conseil <ArrowRight className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => setShowStaff(false)} className="w-full text-xs text-zinc-500 hover:text-white">
              Retour
            </button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
