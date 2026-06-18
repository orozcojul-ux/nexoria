/**
 * TwoFASetup — section within Settings › Security for staff accounts.
 * Lets the user enable, verify, or disable TOTP 2-factor authentication.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldX, QrCode, Copy, Check, Trash2, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function TwoFASetup() {
  const [status, setStatus] = useState(null);
  const [setupData, setSetupData] = useState(null); // {secret, provisioning_uri}
  const [confirmCode, setConfirmCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/2fa/status");
      setStatus(data);
    } catch { setStatus({ enabled: false, verified: false }); }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const startSetup = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/admin/2fa/setup");
      setSetupData(data);
      setConfirmCode("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally { setLoading(false); }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/admin/2fa/confirm-setup", { code: confirmCode.replace(/\s/g, "") });
      toast.success("2FA activée — votre compte est sécurisé !");
      setSetupData(null);
      setConfirmCode("");
      loadStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Code invalide");
    } finally { setLoading(false); }
  };

  const disableTwoFA = async (e) => {
    e.preventDefault();
    if (!window.confirm("Désactiver la 2FA ? Votre compte sera moins sécurisé.")) return;
    setLoading(true);
    try {
      await api.delete("/admin/2fa", { data: { code: disableCode.replace(/\s/g, "") } });
      toast.success("2FA désactivée");
      setShowDisable(false);
      setDisableCode("");
      loadStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Code invalide");
    } finally { setLoading(false); }
  };

  const copySecret = (secret) => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (status === null) {
    return <div className="flex py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-5" data-testid="2fa-setup">
      {/* Status badge */}
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${status.enabled ? "border-emerald-500/35 bg-emerald-500/5" : "border-amber-500/35 bg-amber-500/5"}`}>
        {status.enabled
          ? <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          : <ShieldX className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        }
        <div>
          <div className={`text-sm font-bold ${status.enabled ? "text-emerald-200" : "text-amber-200"}`}>
            {status.enabled ? "Double authentification activée" : "Double authentification désactivée"}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
            {status.enabled
              ? "Votre compte est protégé. Un code TOTP est requis à chaque accès au panel."
              : "Activez la 2FA pour sécuriser l'accès au panel d'administration."}
          </p>
        </div>
      </div>

      {/* ── Enable / Setup flow ── */}
      {!status.enabled && !setupData && (
        <button
          type="button"
          onClick={startSetup}
          disabled={loading}
          data-testid="2fa-start-setup-btn"
          className="px-4 py-2.5 rounded-lg border border-violet-500/50 text-violet-300 font-bold text-sm flex items-center gap-2 hover:bg-violet-500/10 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          Activer la double authentification
        </button>
      )}

      {!status.enabled && setupData && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold mb-3">
              Étape 1 — Scannez le QR code avec votre app
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Ouvrez <strong className="text-white">Google Authenticator</strong>, <strong className="text-white">Authy</strong> ou <strong className="text-white">Bitwarden</strong> et scannez ce code.
            </p>

            {/* QR code via free API */}
            <div className="flex flex-col items-center gap-4">
              <div className="p-2 bg-white rounded-xl inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.provisioning_uri)}`}
                  alt="QR code 2FA"
                  className="w-44 h-44"
                  data-testid="2fa-qr-code"
                />
              </div>

              <div className="w-full">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">
                  Impossible de scanner ? Entrez ce code manuellement
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-violet-200 tracking-widest break-all" data-testid="2fa-secret">
                    {setupData.secret}
                  </code>
                  <button
                    type="button"
                    onClick={() => copySecret(setupData.secret)}
                    className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white"
                    title="Copier"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold mb-3">
              Étape 2 — Confirmez avec votre premier code
            </div>
            <form onSubmit={confirmSetup} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-center text-2xl font-mono-stat tracking-widest focus:outline-none focus:border-violet-500/60"
                data-testid="2fa-confirm-input"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || confirmCode.length !== 6}
                  data-testid="2fa-confirm-btn"
                  className="flex-1 py-2.5 rounded-lg border border-violet-500/50 text-violet-300 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-violet-500/10"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Confirmer et activer
                </button>
                <button
                  type="button"
                  onClick={() => setSetupData(null)}
                  className="px-4 py-2.5 rounded-lg border border-white/10 text-zinc-400 text-sm hover:text-white"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Disable flow ── */}
      {status.enabled && (
        <div>
          {!showDisable ? (
            <button
              type="button"
              onClick={() => setShowDisable(true)}
              data-testid="2fa-disable-btn-open"
              className="px-4 py-2 rounded-lg border border-red-500/40 text-red-300 font-bold text-sm flex items-center gap-2 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" /> Désactiver la 2FA
            </button>
          ) : (
            <form onSubmit={disableTwoFA} className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
              <p className="text-xs text-red-200/80 italic">
                Entrez un code actuel de votre app pour confirmer la désactivation.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Code TOTP"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none"
                data-testid="2fa-disable-code"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || disableCode.length !== 6}
                  data-testid="2fa-disable-confirm"
                  className="flex-1 py-2 rounded-lg border border-red-500/50 text-red-300 font-bold text-sm disabled:opacity-40"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                  Désactiver
                </button>
                <button type="button" onClick={() => setShowDisable(false)} className="px-3 py-2 text-zinc-400 text-sm">
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
