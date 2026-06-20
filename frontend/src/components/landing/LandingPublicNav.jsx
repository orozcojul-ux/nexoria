import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useHeroCard } from "@/contexts/HeroCardContext";
import { buildPublicNav } from "@/i18n/nav-config";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function LandingPublicNav() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { openHeroCard } = useHeroCard();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const { main, more } = buildPublicNav(!!user);

  useEffect(() => {
    const close = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleNav = (item) => {
    if (item.openNexus) {
      window.dispatchEvent(new CustomEvent("nexoria:open-nexus"));
      navigate("/nexus");
    }
    if (item.openHeroCardSelf && user?.user_id) {
      openHeroCard(user.user_id);
    }
  };

  const renderNavItem = (item) => {
    if (item.openHeroCardSelf) {
      return (
        <button
          key={item.labelKey}
          type="button"
          onClick={() => handleNav(item)}
          className="landing-nav-link px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-amber-200 transition-colors"
          data-testid={`pub-nav-${item.labelKey}`}
        >
          {t(item.labelKey)}
        </button>
      );
    }
    return (
      <Link
        key={item.labelKey}
        to={item.to}
        onClick={() => handleNav(item)}
        className="landing-nav-link px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-amber-200 transition-colors"
        data-testid={`pub-nav-${item.labelKey}`}
      >
        {t(item.labelKey)}
      </Link>
    );
  };

  return (
    <header className="landing-pub-nav sticky top-0 z-50 border-b border-amber-500/15" data-testid="landing-public-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" data-testid="landing-logo">
          <Logo size={32} withText={false} />
          <span className="font-display font-black text-lg tracking-[0.15em] landing-gold-text">NEXORIA</span>
        </Link>

        <nav className="hidden xl:flex items-center gap-1 flex-1 justify-center">
          {main.map(renderNavItem)}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="landing-nav-link flex items-center gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-amber-200"
            >
              {t("pub.nav.more")} <ChevronDown className="w-3 h-3" />
            </button>
            {moreOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-xl border border-amber-500/20 bg-[#0a0812]/95 backdrop-blur-xl shadow-2xl py-1 z-50">
                {more.map((item) => (
                  <Link
                    key={item.labelKey}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-2 text-xs text-zinc-300 hover:text-amber-200 hover:bg-white/[0.04]"
                  >
                    {t(item.labelKey)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <ThemeSwitcher compact />
            <LanguageSwitcher compact />
          </div>
          {user ? (
            <Link
              to="/feed"
              className="landing-btn-gold px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
              data-testid="pub-play"
            >
              {t("pub.auth.play")}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-amber-500/40 text-amber-200 rounded hover:bg-amber-500/10 transition-colors"
                data-testid="pub-login"
              >
                {t("pub.auth.login")}
              </Link>
              <Link
                to="/register"
                className="landing-btn-gold px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
                data-testid="pub-register"
              >
                {t("pub.auth.register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
