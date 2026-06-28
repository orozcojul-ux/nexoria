import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Scale, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { PageShell } from "@/components/ui-premium";
import SiteFooter from "@/components/SiteFooter";
import SiteBackground from "@/components/SiteBackground";
import styles from "./LegalDocument.module.css";

const LEGAL_NAV = [
  { to: "/conditions", labelKey: "legal.nav.terms", icon: Scale, id: "terms" },
  { to: "/confidentialite", labelKey: "legal.nav.privacy", icon: Shield, id: "privacy" },
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
  const { t } = useI18n();
  const backTo = user ? "/feed" : "/";

  const content = (
    <PageShell testid={testid}>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.kicker}>{t("legal.kicker")}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>
            {t("legal.updatedLabel")} {t("legal.updatedDate")}
          </p>
        </header>

        <nav className={styles.nav} aria-label={t("legal.kicker")}>
          {LEGAL_NAV.map(({ to, labelKey, id }) => (
            <Link
              key={to}
              to={to}
              className={`${styles.navLink}${active === id ? ` ${styles.navLinkActive}` : ""}`}
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        <article className={styles.panel}>
          {intro && <p className={styles.intro}>{intro}</p>}
          {children}
        </article>

        <Link to={backTo} className={styles.back} data-testid="legal-back-link">
          <ArrowLeft className="w-3.5 h-3.5" />
          {user ? t("legal.backDashboard") : t("legal.backHome")}
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
