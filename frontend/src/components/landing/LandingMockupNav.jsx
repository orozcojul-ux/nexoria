import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";

export default function LandingMockupNav() {
  const { user } = useAuth();
  const { t } = useI18n();

  const NAV = [
    { to: "/", labelKey: "pub.nav.home" },
    { to: "/classes", labelKey: "landing.nav.game" },
    { to: "/forum", labelKey: "landing.nav.community" },
    { to: "/shop", labelKey: "pub.nav.shop" },
  ];

  return (
    <header className="lm-header" data-testid="landing-mockup-nav">
      <Link to="/" className="lm-header-logo" data-testid="landing-logo">
        <Logo size={36} withText={false} />
        <span className="lm-logo-text">NEXORIA</span>
      </Link>

      <nav className="lm-header-nav" aria-label="Navigation principale">
        {NAV.map((item) => (
          <Link key={item.labelKey} to={item.to} className="lm-nav-link" data-testid={`lm-nav-${item.labelKey}`}>
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>

      <div className="lm-header-actions">
        <LanguageSwitcher compact />
        {user ? (
          <Link to="/feed" className="lm-btn lm-btn--cyan" data-testid="pub-play">
            {t("pub.auth.play")}
          </Link>
        ) : (
          <>
            <Link to="/register" className="lm-btn lm-btn--gold" data-testid="pub-register">
              {t("pub.auth.register")}
            </Link>
            <Link to="/login" className="lm-btn lm-btn--cyan" data-testid="pub-login">
              {t("pub.auth.login")}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
