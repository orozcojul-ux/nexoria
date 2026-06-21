import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Scale, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/ui-premium";
import SiteFooter from "@/components/SiteFooter";
import SiteBackground from "@/components/SiteBackground";
import styles from "./LegalDocument.module.css";

export const LEGAL_LAST_UPDATED = "19 juin 2026";

const LEGAL_NAV = [
  { to: "/conditions", label: "Conditions d'utilisation", icon: Scale, id: "terms" },
  { to: "/confidentialite", label: "Confidentialité", icon: Shield, id: "privacy" },
];

export function LegalSection({ title, children }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export default function LegalDocument({
  title,
  intro,
  active = "terms",
  children,
  testid,
}) {
  const { user } = useAuth();
  const backTo = user ? "/feed" : "/";

  const content = (
    <PageShell testid={testid}>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.kicker}>NEXORIA · Documents légaux</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>Dernière mise à jour : {LEGAL_LAST_UPDATED}</p>
        </header>

        <nav className={styles.nav} aria-label="Documents légaux">
          {LEGAL_NAV.map(({ to, label, id }) => (
            <Link
              key={to}
              to={to}
              className={`${styles.navLink}${active === id ? ` ${styles.navLinkActive}` : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <article className={styles.panel}>
          {intro && <p className={styles.intro}>{intro}</p>}
          {children}
        </article>

        <Link to={backTo} className={styles.back} data-testid="legal-back-link">
          <ArrowLeft className="w-3.5 h-3.5" />
          {user ? "Retour au tableau de bord" : "Retour à l'accueil"}
        </Link>
      </div>
    </PageShell>
  );

  if (user) return content;

  return (
    <div className="min-h-screen bg-[var(--nx-bg)] text-white relative">
      <SiteBackground variant="app" />
      <main className="relative z-10 pt-8 pb-4">{content}</main>
      <SiteFooter />
    </div>
  );
}
