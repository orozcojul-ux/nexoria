import React from "react";
import { Loader2 } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ClassBadge from "@/components/ClassBadge";
import { GoogleIcon, DiscordIcon } from "@/components/auth/AuthMedievalCard";
import "@/styles/auth-fantasy.css";

/* ─── Decorative SVGs ─── */

function PanelCorner() {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M2 2 L2 12 L8 8 L12 16 L16 8 L12 4 L22 2 Z" fill="currentColor" opacity="0.4" />
      <path d="M2 2 L12 2 L8 6 L16 10 L8 14 L4 10 L2 20 Z" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

function ArchSvg() {
  return (
    <svg viewBox="0 0 120 800" fill="none" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="af-arch-stone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a2030" />
          <stop offset="100%" stopColor="#0a0e16" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 0 L80 0 L100 200 Q110 400 90 600 L70 800 L0 800 Z" fill="url(#af-arch-stone)" />
      <path d="M30 120 Q60 100 55 200 Q50 350 45 500 Q42 620 38 700" stroke="rgba(0,229,255,0.25)" strokeWidth="1.5" fill="none" />
      <text x="48" y="180" fill="rgba(0,229,255,0.35)" fontSize="14" fontFamily="serif">ᚠ</text>
      <text x="42" y="280" fill="rgba(0,229,255,0.3)" fontSize="12" fontFamily="serif">ᚢ</text>
      <text x="50" y="380" fill="rgba(0,229,255,0.35)" fontSize="14" fontFamily="serif">ᚦ</text>
      <text x="40" y="480" fill="rgba(0,229,255,0.28)" fontSize="11" fontFamily="serif">ᚨ</text>
      <text x="46" y="580" fill="rgba(0,229,255,0.32)" fontSize="13" fontFamily="serif">ᚱ</text>
    </svg>
  );
}

function LogoWings() {
  return (
    <svg className="af-logo__wings" viewBox="0 0 320 80" fill="none" aria-hidden>
      <path d="M10 40 Q40 10 80 20 L100 40 L80 60 Q40 70 10 40" stroke="rgba(212,175,55,0.5)" strokeWidth="1.2" fill="rgba(212,175,55,0.08)" />
      <path d="M310 40 Q280 10 240 20 L220 40 L240 60 Q280 70 310 40" stroke="rgba(212,175,55,0.5)" strokeWidth="1.2" fill="rgba(212,175,55,0.08)" />
      <path d="M155 8 L160 20 L155 32 L150 20 Z" fill="rgba(0,229,255,0.6)" />
      <path d="M155 48 L160 60 L155 72 L150 60 Z" fill="rgba(0,229,255,0.6)" />
    </svg>
  );
}

function ClassTitleOrnament() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 80" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <path d="M20 40 Q80 8 160 25 L200 40 L160 55 Q80 72 20 40" stroke="rgba(212,175,55,0.55)" strokeWidth="1.5" fill="rgba(212,175,55,0.06)" />
      <path d="M580 40 Q520 8 440 25 L400 40 L440 55 Q520 72 580 40" stroke="rgba(212,175,55,0.55)" strokeWidth="1.5" fill="rgba(212,175,55,0.06)" />
      <path d="M295 15 L300 28 L295 40 L290 28 Z" fill="rgba(0,229,255,0.7)" />
      <path d="M295 40 L300 52 L295 65 L290 52 Z" fill="rgba(0,229,255,0.7)" />
    </svg>
  );
}

function FrameCornerGem() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M4 4 L20 4 L24 12 L16 20 L8 12 Z" stroke="currentColor" strokeWidth="1.2" fill="rgba(212,175,55,0.1)" />
      <path d="M12 16 L18 22 L12 28 L6 22 Z" fill="rgba(20,30,50,0.9)" stroke="rgba(0,229,255,0.4)" strokeWidth="0.8" />
    </svg>
  );
}

/* ─── Background scene ─── */

export function AuthFantasyScene({ variant = "form" }) {
  const isClass = variant === "class";
  return (
    <div className={`af-scene ${isClass ? "af-scene--class" : ""}`} aria-hidden>
      <div className="af-scene__base" />
      <div className="af-scene__ruins" />
      <div className="af-scene__mist" />
      {isClass && <div className="af-lightning" />}
      {!isClass && (
        <>
          <div className="af-arch af-arch--left"><ArchSvg /></div>
          <div className="af-arch af-arch--right"><ArchSvg /></div>
          <div className="af-crystal af-crystal--1" />
          <div className="af-crystal af-crystal--2" />
          <div className="af-crystal af-crystal--3" />
          <div className="af-crystal af-crystal--4" />
          <div className="af-crystal af-crystal--5" />
        </>
      )}
    </div>
  );
}

/* ─── Page wrapper ─── */

export function AuthFantasyPage({ children, testid, variant = "form" }) {
  return (
    <div className="af-page" data-testid={testid}>
      <AuthFantasyScene variant={variant} />
      <div className="af-lang">
        <LanguageSwitcher compact />
      </div>
      {children}
    </div>
  );
}

/* ─── Logo ─── */

export function AuthFantasyLogo() {
  const title = "NEXORIA";
  const parts = title.split("");
  return (
    <div className="af-logo">
      <div className="af-logo__frame">
        <LogoWings />
        <h1 className="af-logo__title" aria-label="NEXORIA">
          {parts.map((ch, i) =>
            ch === "O" ? (
              <span key={i} className="af-logo__o-gem">O</span>
            ) : (
              <span key={i}>{ch}</span>
            )
          )}
        </h1>
      </div>
    </div>
  );
}

/* ─── Form panel ─── */

export function AuthFantasyPanel({ children }) {
  return (
    <div className="af-panel-wrap">
      <div className="af-panel-halo" aria-hidden />
      <div className="af-panel">
        <span className="af-panel__gem af-panel__gem--top" aria-hidden />
        <span className="af-panel__gem af-panel__gem--bottom" aria-hidden />
        <div className="af-panel__corner af-panel__corner--tl"><PanelCorner /></div>
        <div className="af-panel__corner af-panel__corner--tr"><PanelCorner /></div>
        <div className="af-panel__corner af-panel__corner--bl"><PanelCorner /></div>
        <div className="af-panel__corner af-panel__corner--br"><PanelCorner /></div>
        <div className="af-panel-body">{children}</div>
      </div>
    </div>
  );
}

export function AuthFantasyFormLayout({ children, showLogo = true }) {
  return (
    <div className="af-layout af-layout--form">
      {showLogo && <AuthFantasyLogo />}
      {children}
    </div>
  );
}

/* ─── Input ─── */

export function AuthFantasyField({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  testid,
  required,
  minLength,
  maxLength,
  autoComplete,
  extra,
}) {
  return (
    <div className="af-field">
      <span className="af-field__gem af-field__gem--l" aria-hidden />
      <span className="af-field__gem af-field__gem--r" aria-hidden />
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="af-field__input"
        data-testid={testid}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={autoComplete}
      />
      {extra && <div className="af-field__extra">{extra}</div>}
    </div>
  );
}

/* ─── OAuth ─── */

export function AuthFantasyOAuth({ onGoogle, onDiscord, googleTestid, discordTestid }) {
  return (
    <div className="af-oauth-row">
      <button
        type="button"
        onClick={onGoogle}
        className="af-oauth-btn af-oauth-btn--google"
        data-testid={googleTestid}
        aria-label="Google"
      >
        <GoogleIcon />
      </button>
      <button
        type="button"
        onClick={onDiscord}
        className="af-oauth-btn af-oauth-btn--discord"
        data-testid={discordTestid}
        aria-label="Discord"
      >
        <DiscordIcon />
      </button>
    </div>
  );
}

export function AuthFantasyDiscordNote({ children }) {
  return <p className="af-discord-note">{children}</p>;
}

/* ─── Buttons ─── */

export function AuthFantasyPrimaryBtn({ children, disabled, type = "button", onClick, testid, variant = "default" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className={`af-btn-primary ${variant === "birth" ? "af-btn-primary--birth" : ""}`}
    >
      <span className="af-btn-primary__glow" aria-hidden />
      <span className="af-btn-primary__text">{children}</span>
    </button>
  );
}

export function AuthFantasyBackBtn({ children, onClick, testid }) {
  return (
    <button type="button" onClick={onClick} className="af-btn-back" data-testid={testid}>
      {children}
    </button>
  );
}

/* ─── Class selection ─── */

export function AuthClassPage({ title, children, footer }) {
  return (
    <div className="af-layout af-layout--class">
      <div className="af-class-frame">
        <div className="af-class-frame__corner af-class-frame__corner--tl"><FrameCornerGem /></div>
        <div className="af-class-frame__corner af-class-frame__corner--tr"><FrameCornerGem /></div>
        <div className="af-class-frame__corner af-class-frame__corner--bl"><FrameCornerGem /></div>
        <div className="af-class-frame__corner af-class-frame__corner--br"><FrameCornerGem /></div>

        <div className="af-class-title">
          <div className="af-class-title__banner">
            <ClassTitleOrnament />
            <h1 className="af-class-title__text">{title}</h1>
          </div>
        </div>

        {children}
        {footer}
      </div>
    </div>
  );
}

export function AuthClassGrid({ classes, selectedId, onSelect }) {
  return (
    <div className="af-class-grid">
      {classes.map((c) => {
        const selected = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`af-class-card ${selected ? "af-class-card--selected" : ""}`}
            style={selected ? { "--class-color": c.color } : { "--class-color": c.color }}
            data-testid={`class-card-${c.id}`}
          >
            <div className="af-class-emblem" aria-hidden>
              <div className="af-class-emblem__aura" />
              <div className="af-class-emblem__ring">
                <ClassBadge classId={c.id} color={c.color} size="xxl" variant="medallion" />
              </div>
            </div>
            <div className="af-class-card__name">{c.name}</div>
            <div className="af-class-card__desc">{c.tagline}</div>
          </button>
        );
      })}
    </div>
  );
}

export function AuthClassFooter({ backLabel, onBack, backTestid, submitLabel, onSubmit, submitDisabled, submitLoading, submitTestid }) {
  return (
    <div className="af-class-footer">
      <AuthFantasyBackBtn onClick={onBack} testid={backTestid}>
        {backLabel}
      </AuthFantasyBackBtn>
      <div className="af-class-footer__center">
        <AuthFantasyPrimaryBtn
          onClick={onSubmit}
          disabled={submitDisabled || submitLoading}
          testid={submitTestid}
          variant="birth"
        >
          {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
        </AuthFantasyPrimaryBtn>
      </div>
      <div className="af-class-footer__spacer" aria-hidden />
    </div>
  );
}

export function AuthFantasyFooterLink({ children }) {
  return <p className="af-footer-link">{children}</p>;
}
