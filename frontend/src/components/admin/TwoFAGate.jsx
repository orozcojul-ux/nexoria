/**
 * TwoFAGate — wraps any content that requires 2FA verification.
 *
 * Shows a code-entry screen until the user provides a valid TOTP code
 * (verified server-side, session flag valid 8 hours).
 * If 2FA is not yet enabled on the account, shows a non-blocking warning
 * with a setup prompt instead.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldX, Loader2, KeyRound, QrCode, Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

/* ─── Code input: 6 individual boxes ─────────────────────────────────────── */
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);

  // Build a clean 6-element array where each element is "" or a single digit.
  // NEVER use spaces — a space in `value` causes maxLength to block new input.
  const digits = Array.from({ length: 6 }, (_, i) => value?.[i] ?? "");

  const handleChange = (i, e) => {
    // Extract only the last typed digit (handles paste-into-single-box too)
    const raw = e.target.value.replace(/\D/g, "");
    const ch = raw.slice(-1); // keep only 1 digit
    const arr = digits.map((d) => d); // copy
    arr[i] = ch;
    onChange(arr.join(""));
    if (ch && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === "Backspace") {
      if (!digits[i] && i > 0) {
        // Current box already empty → go back and clear previous
        const arr = digits.map((d) => d);
        arr[i - 1] = "";
        onChange(arr.join(""));
        inputs.current[i - 1]?.focus();
      } else {
        const arr = digits.map((d) => d);
        arr[i] = "";
        onChange(arr.join(""));
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      inputs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    const nextIdx = Math.min(pasted.length, 5);
    inputs.current[nextIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onFocus={(e) => e.target.select()}
          className="w-12 h-14 text-center text-2xl font-mono-stat font-black rounded-xl border bg-black/50 focus:outline-none transition-all disabled:opacity-40"
          style={{
            borderColor: d ? "#7c3aed" : "rgba(255,255,255,0.12)",
            color: d ? "#c4b5fd" : "#9ca3af",
            boxShadow: d ? "0 0 12px rgba(124,58,237,0.4)" : "none",
          }}
          data-testid={`otp-digit-${i}`}
        />
      ))}
    </div>
  );
}

/* ─── Main gate ───────────────────────────────────────────────────────────── */
export default function TwoFAGate({ children }) {
  const [status, setStatus] = useState(null); // null = loading
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const checkStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/2fa/status");
      setStatus(data);
    } catch {
      // If the endpoint fails (e.g. network), fail open so admins aren't locked out
      setStatus({ enabled: false, verified: true });
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const verify = async () => {
    const trimmed = code.replace(/\s/g, "");
    if (trimmed.length !== 6) return;
    setVerifying(true);
    setError("");
    try {
      await api.post("/admin/2fa/verify", { code: trimmed });
      setStatus((s) => ({ ...s, verified: true }));
      toast.success("Identité vérifiée — bienvenue dans le Conseil");
    } catch (err) {
      setError(err.response?.data?.detail || "Code invalide");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (code.replace(/\s/g, "").length === 6) verify();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading ──
  if (status === null) {
    return (
      <div className="flex items-center justify-center py-32 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // ── 2FA not enabled: show warning + redirect to setup ──
  if (!status.enabled) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/8 p-4 flex items-start gap-3"
        >
          <ShieldX className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-amber-200 mb-0.5">Double authentification non activée</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Pour sécuriser l'accès au Conseil, activez la 2FA depuis
              <strong className="text-amber-300"> Paramètres › Sécurité</strong>.
              Compatible Google Authenticator, Authy, Bitwarden, 1Password.
            </p>
          </div>
        </motion.div>
        {children}
      </>
    );
  }

  // ── 2FA verified ──
  if (status.verified) return children;

  // ── 2FA required but not verified ──
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
      data-testid="2fa-gate"
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-8 space-y-6"
        style={{
          borderColor: "rgba(124,58,237,0.5)",
          background: "linear-gradient(160deg,rgba(15,8,32,0.98),rgba(10,6,19,0.98))",
          boxShadow: "0 0 48px rgba(124,58,237,0.25), inset 0 0 32px rgba(124,58,237,0.05)",
        }}
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.5)" }}
          >
            <ShieldCheck className="w-8 h-8 text-violet-300" style={{ filter: "drop-shadow(0 0 10px rgba(196,181,253,0.7))" }} />
          </div>
          <h2 className="font-display font-black text-xl text-white">Vérification 2FA</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ouvrez votre application authenticator et entrez le code à 6 chiffres.
          </p>
        </div>

        {/* OTP input */}
        <OtpInput value={code} onChange={setCode} disabled={verifying} />

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-red-400"
            data-testid="2fa-error"
          >
            {error}
          </motion.p>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={verify}
          disabled={verifying || code.replace(/\s/g, "").length !== 6}
          data-testid="2fa-verify-btn"
          className="w-full py-3 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}
        >
          {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {verifying ? "Vérification…" : "Accéder au Conseil"}
        </button>

        <p className="text-center text-[10px] text-zinc-600">
          La vérification reste valide 8 heures.
        </p>
      </div>
    </motion.div>
  );
}
