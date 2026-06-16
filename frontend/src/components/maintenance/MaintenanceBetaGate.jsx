import React, { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import api, { setBetaKey } from "@/lib/api";

export default function MaintenanceBetaGate() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const value = key.trim();
    if (!value) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/maintenance/beta", { key: value });
      setBetaKey(value);
      setSuccess(true);
      setTimeout(() => window.location.replace("/"), 900);
    } catch (err) {
      const msg = err?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Clé beta invalide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="maint-panel maint-beta-panel" data-testid="maintenance-beta-gate">
      <h2 className="maint-panel-title">Accès testeur · clé beta</h2>

      {success ? (
        <div className="maint-beta-success" data-testid="beta-key-success">
          <ShieldCheck className="maint-beta-success-icon" strokeWidth={1.75} />
          <span>Accès débloqué — redirection…</span>
        </div>
      ) : (
        <form onSubmit={submit} className="maint-beta-form">
          <p className="maint-beta-hint">
            Vous faites partie des testeurs&nbsp;? Entrez votre clé beta pour accéder au site.
          </p>
          <div className="maint-beta-field">
            <KeyRound className="maint-beta-field-icon" strokeWidth={1.75} />
            <input
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="BETA-XXXX-XXXX"
              className="maint-beta-input"
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
              data-testid="beta-key-input"
            />
          </div>
          {error && (
            <p className="maint-beta-error" data-testid="beta-key-error">{error}</p>
          )}
          <button
            type="submit"
            className="maint-beta-btn"
            disabled={loading || !key.trim()}
            data-testid="beta-key-submit"
          >
            {loading ? <Loader2 className="maint-beta-spin" strokeWidth={2} /> : "Débloquer l'accès"}
          </button>
        </form>
      )}
    </div>
  );
}
