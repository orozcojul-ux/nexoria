import React, { useEffect, useRef, useState } from "react";
import { Construction, ArrowRight, Hammer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
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
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  useEffect(() => {
    api.get("/system/maintenance").then((r) => setMaintenance(r.data));
    const id = setInterval(() => api.get("/system/maintenance").then((r) => {
      setMaintenance(r.data);
      if (!r.data.enabled) navigate("/feed");
    }).catch(() => {}), 15000);
    return () => clearInterval(id);
  }, [navigate]);

  // Hidden trigger: 5 rapid clicks on logo (within 3s window) to reveal staff login form.
  // Also: Konami-like keyboard shortcut Shift+Shift+Shift on landing.
  const onLogoClick = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 3000);
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      setShowStaff(true);
    }
  };

  // Keyboard shortcut: Ctrl+Shift+S (Staff)
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        setShowStaff(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        className="relative z-10 max-w-3xl w-full text-center">

        {/* Logo - hidden trigger zone (5 rapid clicks reveal staff form) */}
        <motion.button
          type="button"
          onClick={onLogoClick}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="block mx-auto mb-8 focus:outline-none cursor-default"
          aria-label="NEXORIA"
          data-testid="maintenance-logo-trigger"
        >
          <img
            src="/logo.png"
            alt="NEXORIA"
            className="w-72 h-72 sm:w-96 sm:h-96 object-contain animate-float select-none"
            style={{ filter: "drop-shadow(0 0 60px rgba(157,76,221,0.7)) drop-shadow(0 0 30px rgba(0,229,255,0.6))" }}
            draggable={false}
            data-testid="maintenance-logo"
          />
        </motion.button>

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

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono-stat mb-4">
          <Hammer className="w-3 h-3 animate-pulse" />
          <span>Les forgerons œuvrent dans l'ombre — re-vérification toutes les 15s</span>
        </div>

        {/* Staff form revealed only via hidden trigger */}
        <AnimatePresence>
          {showStaff && (
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onSubmit={staffLogin}
              className="glass glass-violet rounded-2xl p-6 max-w-sm mx-auto space-y-3 text-left mt-6"
              data-testid="staff-form">
              <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold font-display text-center mb-3">
                {t("maintenance.staff")}
              </div>
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
              <button type="button" onClick={() => setShowStaff(false)}
                className="w-full text-xs text-zinc-500 hover:text-white" data-testid="staff-close">
                Retour
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
