import React, { useEffect, useState } from "react";
import { FlaskConical, Loader2, Send, Users } from "lucide-react";
import api from "@/lib/api";

const BETA_SLOTS = 100;

export default function MaintenanceBetaApply() {
  const [stats, setStats] = useState({ count: 0, max: BETA_SLOTS, open: true });
  const [email, setEmail] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [motivation, setMotivation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/maintenance/beta/stats")
      .then(({ data }) => setStats({ count: data.count ?? 0, max: data.max ?? BETA_SLOTS, open: data.open !== false }))
      .catch(() => {});
  }, []);

  const remaining = Math.max(0, stats.max - stats.count);

  const submit = async (e) => {
    e.preventDefault();
    if (!stats.open) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/maintenance/beta/apply", {
        email: email.trim(),
        discord_username: discordUsername.trim(),
        motivation: motivation.trim(),
      });
      setSuccess(true);
      setStats((s) => ({ ...s, count: Math.min(s.max, s.count + 1), open: s.count + 1 < s.max }));
    } catch (err) {
      const msg = err?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Impossible d'envoyer la candidature");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="maint-panel maint-beta-apply-panel" data-testid="maintenance-beta-apply">
      <div className="maint-beta-apply-head">
        <FlaskConical className="maint-beta-apply-icon" strokeWidth={1.5} aria-hidden />
        <div>
          <h2 className="maint-panel-title maint-beta-apply-title">Candidature beta testeur</h2>
          <p className="maint-beta-apply-lead">
            NEXORIA recrute <strong>{stats.max} pionniers</strong>. Envoie ta candidature —
            examinée en privé par le Conseil (Sages).
          </p>
        </div>
      </div>

      <div className="maint-beta-apply-slots" data-testid="beta-slots-counter">
        <Users className="maint-beta-apply-slots-icon" strokeWidth={1.75} />
        <span>
          {remaining > 0 ? (
            <>
              <strong>{remaining}</strong> place{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
            </>
          ) : (
            <strong>Complet</strong>
          )}
          {" · "}
          {stats.count}/{stats.max} inscrits
        </span>
      </div>

      {success ? (
        <div className="maint-beta-apply-success" data-testid="beta-apply-success">
          Candidature envoyée ! Tu seras contacté après examen par le Conseil.
        </div>
      ) : stats.open ? (
        <form className="maint-beta-apply-form" onSubmit={submit} data-testid="beta-apply-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="maint-beta-apply-input"
            required
            maxLength={120}
            data-testid="beta-apply-email"
          />
          <input
            value={discordUsername}
            onChange={(e) => setDiscordUsername(e.target.value)}
            placeholder="Pseudo Discord (ex. héros#1234)"
            className="maint-beta-apply-input"
            required
            maxLength={64}
            data-testid="beta-apply-discord"
          />
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Pourquoi veux-tu tester Nexoria ?"
            className="maint-beta-apply-textarea"
            rows={3}
            maxLength={600}
            data-testid="beta-apply-motivation"
          />
          {error && <p className="maint-beta-apply-error" data-testid="beta-apply-error">{error}</p>}
          <div className="maint-beta-apply-actions">
            <button
              type="submit"
              className="maint-beta-apply-submit"
              disabled={loading}
              data-testid="beta-apply-submit"
            >
              {loading ? <Loader2 className="maint-beta-spin" strokeWidth={2} /> : (
                <>
                  <Send className="maint-beta-apply-submit-icon" strokeWidth={2} />
                  Envoyer ma candidature
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="maint-beta-apply-closed">Les {stats.max} places beta sont pourvues. Merci pour ton intérêt — rendez-vous à l'ouverture !</p>
      )}
    </div>
  );
}
