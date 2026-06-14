/**
 * NEXORIA Premium UI components — shared design system.
 * All pages should compose with these to guarantee consistent visual language.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SECTION_TONE } from "@/lib/design-tokens";

/* ============== PREMIUM CARD ============== */
export function PremiumCard({ tone = "violet", className = "", glow = true, hover = true, children, onClick, testid, ...rest }) {
  const t = SECTION_TONE[tone] || SECTION_TONE.violet;
  return (
    <motion.div
      whileHover={hover ? { y: -3, scale: 1.01 } : undefined}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      data-testid={testid}
      className={`relative rounded-xl border ${t.border} bg-gradient-to-br from-[#0F0820]/80 via-[#0A0613]/80 to-[#0F0820]/80 backdrop-blur p-4 transition-all ${className}`}
      style={glow ? { boxShadow: `0 0 24px ${t.color}33, inset 0 0 12px ${t.color}11` } : undefined}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ============== PREMIUM BUTTON ============== */
const BTN_VARIANT = {
  violet: "bg-gradient-to-r from-purple-600 to-violet-700 border-purple-400/50 text-white hover:shadow-[0_0_24px_rgba(168,85,247,0.5)]",
  cyan:   "bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400/50 text-white hover:shadow-[0_0_24px_rgba(0,229,255,0.5)]",
  gold:   "bg-gradient-to-r from-amber-500 to-yellow-500 border-yellow-400/60 text-black font-black hover:shadow-[0_0_24px_rgba(252,211,77,0.6)]",
  ghost:  "bg-transparent border-white/20 text-zinc-200 hover:bg-white/5 hover:border-white/40",
  danger: "bg-gradient-to-r from-red-600 to-red-700 border-red-400/50 text-white hover:shadow-[0_0_24px_rgba(239,68,68,0.5)]",
};
const BTN_SIZE = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};
export function PremiumButton({ variant = "violet", size = "md", icon: Icon, children, testid, className = "", ...rest }) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
      data-testid={testid}
      className={`relative rounded-lg border font-display font-bold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </motion.button>
  );
}

/* ============== PREMIUM SECTION ============== */
export function PremiumSection({ title, subtitle, icon: Icon, tone = "cyan", action, children, testid }) {
  const t = SECTION_TONE[tone] || SECTION_TONE.cyan;
  return (
    <section className="mb-6" data-testid={testid}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${t.text}`} />}
          <h2 className={`font-display font-black text-lg uppercase tracking-widest ${t.text}`}>{title}</h2>
          {subtitle && <span className="text-[10px] text-zinc-500 italic">{subtitle}</span>}
        </div>
        <div className="flex-1 h-px mx-3 bg-gradient-to-r from-current/40 to-transparent opacity-40" />
        {action}
      </div>
      {children}
    </section>
  );
}

/* ============== PREMIUM STAT BLOCK ============== */
export function PremiumStat({ icon: Icon, label, value, sub, tone = "cyan", trend, testid }) {
  const t = SECTION_TONE[tone] || SECTION_TONE.cyan;
  return (
    <div className="relative rounded-xl border border-white/10 bg-gradient-to-br from-black/40 to-[#1A0B3D]/30 p-4 overflow-hidden group"
      data-testid={testid}
      style={{ boxShadow: `0 0 16px ${t.color}22` }}>
      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ background: `radial-gradient(circle at top right, ${t.color}, transparent 60%)` }} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">{label}</div>
          <div className="font-mono-stat text-3xl font-black mt-1" style={{ color: t.color }}>
            {value}
          </div>
          {sub && <div className="text-[10px] text-zinc-500 mt-1">{sub}</div>}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg" style={{ background: `${t.color}22` }}>
            <Icon className="w-5 h-5" style={{ color: t.color }} />
          </div>
        )}
      </div>
      {trend && (
        <div className={`mt-2 text-[10px] font-bold ${trend > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

/* ============== PREMIUM SIDEBAR (page-level) ============== */
export function PremiumSidebar({ items = [], active, onSelect, footer, testidPrefix = "sidebar" }) {
  return (
    <aside className="space-y-1">
      {items.map((it) => {
        const Ico = it.icon;
        const isActive = active === it.id;
        return (
          <button key={it.id} onClick={() => onSelect(it.id)}
            data-testid={`${testidPrefix}-${it.id}`}
            className={`w-full text-left px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${isActive ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-zinc-400 hover:border-white/30 hover:bg-white/5"}`}>
            {Ico && <Ico className="w-4 h-4" />}
            <span className="flex-1 font-display font-bold text-sm">{it.label}</span>
            {it.count !== undefined && (
              <span className="text-[10px] text-zinc-500 font-mono">{it.count}</span>
            )}
          </button>
        );
      })}
      {footer && <div className="pt-3 mt-3 border-t border-white/10">{footer}</div>}
    </aside>
  );
}

/* ============== PREMIUM HERO BANNER ============== */
export function PremiumHero({ title, subtitle, kicker, image, ctaLabel, onCta, ctaIcon, height = 280, testid, children }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-purple-500/40 group"
      style={{ height }} data-testid={testid}>
      {image && (
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0613] via-transparent to-transparent" />
      {/* Cosmic dust particles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="absolute w-1 h-1 rounded-full bg-cyan-300 animate-pulse"
          style={{
            top: `${15 + i * 12}%`, left: `${60 + (i % 3) * 12}%`,
            boxShadow: "0 0 10px rgba(0,229,255,0.8)", animationDelay: `${i * 0.3}s`,
          }} />
      ))}
      <div className="relative h-full flex flex-col justify-end p-6 max-w-2xl">
        {kicker && <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300 font-bold mb-2">{kicker}</div>}
        <h1 className="font-display font-black text-3xl sm:text-5xl text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-zinc-300 text-sm sm:text-base mt-2 max-w-xl">{subtitle}</p>}
        {children}
        {ctaLabel && (
          <div className="mt-4">
            <PremiumButton variant="violet" size="lg" onClick={onCta} icon={ctaIcon}>{ctaLabel}</PremiumButton>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== PREMIUM BADGE (rarity-aware) ============== */
import { RARITY } from "@/lib/design-tokens";
export function PremiumBadge({ badge, size = "md", testid }) {
  const r = RARITY[badge.rarity] || RARITY.common;
  const sz = size === "sm" ? "w-12 h-12 text-xl" : size === "lg" ? "w-20 h-20 text-4xl" : "w-16 h-16 text-3xl";
  return (
    <div
      title={`${badge.name} — ${r.fr}`}
      data-testid={testid || `badge-${badge.badge_id || badge.id || badge.name}`}
      className={`relative ${sz} rounded-lg ${r.border} border-2 bg-gradient-to-br ${r.bg} flex items-center justify-center cursor-pointer group transition-all hover:scale-110`}
      style={{ boxShadow: `0 0 12px ${r.glow}, inset 0 0 8px ${r.glow}` }}
    >
      <span className="drop-shadow-lg">{badge.icon || "✨"}</span>
      {badge.rarity === "cosmic" && (
        <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-300 via-purple-400 to-cyan-300 opacity-30 animate-pulse" />
        </div>
      )}
    </div>
  );
}

/* ============== PREMIUM MODAL ============== */
export function PremiumModal({ open, onClose, title, icon: Icon, maxWidth = "max-w-3xl", children, testid, footer }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={onClose} data-testid={testid}>
          <motion.div
            initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${maxWidth} max-h-[90vh] bg-gradient-to-br from-[#0F0820] via-[#0A0613] to-[#1A0B3D] border border-purple-500/40 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(157,76,221,0.4)] flex flex-col`}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gradient-to-r from-purple-900/30 to-transparent">
              <div className="flex items-center gap-2">
                {Icon && <Icon className="w-5 h-5 text-yellow-300" />}
                <span className="font-display font-black text-lg uppercase tracking-widest text-purple-200">{title}</span>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && <div className="border-t border-white/10 p-3 bg-black/40">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
