import React from "react";
import { CornerOrnament, RuneDivider } from "@/components/Ornaments";

/** Ornate parchment panel for login / register — grimoire médiéval. */
export default function AuthMedievalCard({ children, wide = false, seal }) {
  return (
    <div
      className={`relative mx-auto ${wide ? "max-w-4xl" : "max-w-md"}`}
      data-testid="auth-medieval-card"
    >
      <div
        className="relative parchment rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,196,100,0.12)]"
        style={{ border: "1px solid rgba(201,165,101,0.28)" }}
      >
        <CornerOrnament className="absolute top-2 left-2 w-8 h-8 z-10" color="rgba(201,165,101,0.55)" />
        <CornerOrnament className="absolute top-2 right-2 w-8 h-8 z-10 flip" color="rgba(201,165,101,0.55)" />
        <CornerOrnament className="absolute bottom-2 left-2 w-8 h-8 z-10 scale-y-[-1]" color="rgba(201,165,101,0.55)" />
        <CornerOrnament className="absolute bottom-2 right-2 w-8 h-8 z-10 scale-y-[-1] flip" color="rgba(201,165,101,0.55)" />

        {/* Top crest band */}
        <div
          className="relative px-6 py-4 border-b text-center"
          style={{
            borderColor: "rgba(201,165,101,0.2)",
            background: "linear-gradient(180deg, rgba(60,40,20,0.45) 0%, rgba(20,12,8,0.2) 100%)",
          }}
        >
          {seal && <div className="flex justify-center mb-2">{seal}</div>}
          <div className="h-px w-full max-w-xs mx-auto bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        </div>

        <div className="relative px-6 sm:px-10 py-8 sm:py-10">{children}</div>
      </div>
    </div>
  );
}

export function AuthMedievalTitle({ kicker, title, subtitle }) {
  return (
    <div className="text-center mb-8">
      {kicker && (
        <div className="text-[10px] uppercase tracking-[0.42em] text-amber-500/80 font-bold mb-3">{kicker}</div>
      )}
      <h1 className="font-display font-black text-3xl sm:text-4xl ancient-text mb-2">{title}</h1>
      {subtitle && <p className="text-sm text-zinc-400 italic leading-relaxed max-w-sm mx-auto">{subtitle}</p>}
      <RuneDivider className="mt-5 max-w-xs mx-auto" />
    </div>
  );
}

export const authInputCls =
  "w-full bg-[#0c0806]/80 border border-amber-900/40 rounded-lg px-4 py-3.5 text-sm text-amber-50/90 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/55 focus:shadow-[0_0_18px_rgba(201,165,101,0.12)] transition-all font-mono-stat";

export function AuthPrimaryBtn({ children, disabled, type = "button", onClick, testid, className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className={`w-full py-3.5 rounded-lg font-display font-bold text-sm uppercase tracking-[0.2em] text-amber-950 border border-amber-400/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110 ${className}`}
      style={{
        background: "linear-gradient(180deg, #e8c87a 0%, #c9a565 45%, #9a7b3c 100%)",
        boxShadow: "0 4px 20px rgba(201,165,101,0.25), inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
    >
      {children}
    </button>
  );
}

export function AuthOAuthBtn({ onClick, testid, children, icon, variant = "default" }) {
  const discord = variant === "discord";
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={`w-full py-3 rounded-lg border text-sm flex items-center justify-center gap-3 transition-all ${
        discord
          ? "border-[#5865F2]/45 bg-[#5865F2]/10 text-zinc-100 hover:bg-[#5865F2]/20 hover:border-[#5865F2]/65"
          : "border-amber-900/35 bg-black/25 text-zinc-300 hover:border-amber-600/40 hover:bg-amber-950/20"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export const DiscordIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#5865F2">
    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

export const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);
