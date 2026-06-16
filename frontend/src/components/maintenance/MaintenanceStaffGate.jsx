import React, { useEffect, useState } from "react";
import { Shield, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { setToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumButton, PremiumModal } from "@/components/ui-premium";

export default function MaintenanceStaffGate() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        <form onSubmit={submit} className="p-5 space-y-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold">
            Connexion staff uniquement
          </p>
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
          <PremiumButton type="submit" variant="gold" size="md" className="w-full" disabled={loading} testid="staff-submit">
            {loading ? "Connexion…" : "Se connecter"}
          </PremiumButton>
        </form>
      </PremiumModal>
    </>
  );
}
