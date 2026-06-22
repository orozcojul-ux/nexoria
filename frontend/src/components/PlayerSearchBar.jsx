import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { useHeroCard } from "@/contexts/HeroCardContext";
import HeroName from "@/components/HeroName";
import { getUserAvatarUrl } from "@/lib/user-avatar";

export default function PlayerSearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const { openHeroCardByUsername } = useHeroCard();
  const isAdminPage = location.pathname.startsWith("/admin");

  const [q, setQ] = useState(() => (isAdminPage ? searchParams.get("q") || "" : ""));
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isAdminPage) setQ(searchParams.get("q") || "");
  }, [isAdminPage, searchParams]);

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const fetchResults = (term) => {
    clearTimeout(debounceRef.current);
    if (term.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/users/search", { params: { q: term.trim() } });
        setResults(data || []);
        setOpen(true);
        setActiveIdx(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  };

  const goTo = (username) => {
    setOpen(false);
    setQ("");
    if (isAdminPage) {
      navigate(`/admin?tab=users&q=${encodeURIComponent(username)}`);
    } else {
      openHeroCardByUsername(username);
    }
  };

  const runSearch = (e) => {
    e?.preventDefault();
    const term = q.trim();
    if (!term) {
      if (isAdminPage) {
        const params = new URLSearchParams(searchParams);
        params.delete("q");
        if (!params.get("tab")) params.set("tab", "users");
        navigate(`/admin?${params.toString()}`);
      }
      return;
    }
    if (results.length === 1) {
      goTo(results[0].username);
      return;
    }
    const exact = results.find((r) => r.username.toLowerCase() === term.toLowerCase());
    if (exact) {
      goTo(exact.username);
      return;
    }
    if (results.length > 0) {
      goTo(results[0].username);
      return;
    }
    if (isAdminPage) {
      navigate(`/admin?tab=users&q=${encodeURIComponent(term)}`);
    } else {
      openHeroCardByUsername(term);
    }
  };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      e.currentTarget.focus();
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      goTo(results[activeIdx].username);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="w-full max-w-xl relative" data-testid="hero-search-form">
      <form onSubmit={runSearch} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nx-accent)] opacity-70 pointer-events-none" />
        {loading && (
          <Loader2 className="absolute right-14 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 animate-spin" />
        )}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); fetchResults(e.target.value); }}
          onFocus={() => q.trim().length >= 2 && results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={isAdminPage ? t("search.admin_placeholder") : t("search.placeholder")}
          className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-[var(--nx-input-bg)] border border-[var(--nx-border)] text-sm text-white placeholder-zinc-500 text-center sm:text-left focus:outline-none focus:border-[var(--nx-accent)] focus:shadow-[0_0_20px_var(--nx-glow)] transition-all"
          data-testid="player-search-input"
          aria-label={t("search.aria")}
          autoComplete="off"
        />
        <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 rounded border border-white/10 text-[9px] font-mono-stat text-zinc-500">
          Ctrl K
        </kbd>
      </form>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] backdrop-blur-xl shadow-2xl overflow-hidden">
          {results.map((u, i) => (
            <button
              key={u.user_id}
              type="button"
              onClick={() => goTo(u.username)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === activeIdx ? "bg-violet-500/15" : "hover:bg-white/[0.04]"
              }`}
              data-testid={`search-result-${u.username}`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                {getUserAvatarUrl(u) ? <img src={getUserAvatarUrl(u)} alt="" className="w-full h-full object-cover" /> : u.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <HeroName user={u} size="sm" />
                <div className="text-[10px] text-zinc-500">{u.class_name} · {t("common.level")} {u.level}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && q.trim().length >= 2 && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-[var(--nx-border)] bg-[var(--nx-surface)] backdrop-blur-xl px-4 py-3 text-xs text-zinc-500 italic">
          {t("search.no_results")}
        </div>
      )}
    </div>
  );
}
