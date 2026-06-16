/** Shop banner cosmetics — gradients + accents for profile headers */
export const BANNER_STYLES = {
  banner_dragon: {
    from: "#450a0a", via: "#dc2626", to: "#1a0505",
    accent: "#f87171", glow: "rgba(220,38,38,0.45)", label: "Dragon",
  },
  banner_phoenix: {
    from: "#431407", via: "#ea580c", to: "#1c0a04",
    accent: "#fb923c", glow: "rgba(234,88,12,0.45)", label: "Phénix",
  },
  banner_nebula: {
    from: "#1e1b4b", via: "#7c3aed", to: "#0c0618",
    accent: "#a78bfa", glow: "rgba(124,58,237,0.5)", label: "Nébuleuse",
  },
  banner_aurora: {
    from: "#042f2e", via: "#06b6d4", to: "#031216",
    accent: "#22d3ee", glow: "rgba(6,182,212,0.45)", label: "Aurore",
  },
  banner_void: {
    from: "#0f0a1a", via: "#4c1d95", to: "#030108",
    accent: "#c084fc", glow: "rgba(76,29,149,0.5)", label: "Vide",
  },
  banner_gold: {
    from: "#422006", via: "#ca8a04", to: "#1a0f02",
    accent: "#fcd34d", glow: "rgba(202,138,4,0.45)", label: "Or royal",
  },
  banner_frost: {
    from: "#0c1929", via: "#38bdf8", to: "#061018",
    accent: "#7dd3fc", glow: "rgba(56,189,248,0.4)", label: "Givre",
  },
  banner_blood: {
    from: "#1a0505", via: "#991b1b", to: "#0a0202",
    accent: "#ef4444", glow: "rgba(153,27,27,0.5)", label: "Sang",
  },
  banner_emerald: {
    from: "#052e16", via: "#059669", to: "#021a0d",
    accent: "#34d399", glow: "rgba(5,150,105,0.4)", label: "Émeraude",
  },
};

export function getBannerStyle(sku) {
  return BANNER_STYLES[sku] || BANNER_STYLES.banner_nebula;
}

export function ProfileBannerHeader({ sku, bannerUrl, className = "" }) {
  const style = sku ? getBannerStyle(sku) : null;
  if (!sku && !bannerUrl) return null;
  return (
    <div className={`relative w-full h-36 sm:h-44 rounded-xl overflow-hidden border border-white/10 mb-4 ${className}`} data-testid={sku ? `profile-banner-${sku}` : "profile-banner-url"}>
      {bannerUrl && (
        <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      {style && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${style.from} 0%, ${style.via} 40%, ${style.to} 100%)`,
            opacity: bannerUrl ? 0.55 : 1,
          }}
        />
      )}
      {style && (
        <div
          className="absolute inset-0 opacity-60"
          style={{ background: `radial-gradient(ellipse 70% 80% at 30% 20%, ${style.glow}, transparent 65%)` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0613] via-transparent to-transparent" />
      {style && (
        <div className="absolute bottom-3 right-4 text-[9px] uppercase tracking-[0.35em] font-bold" style={{ color: style.accent }}>
          {style.label}
        </div>
      )}
    </div>
  );
}

export function BannerPreview({ sku, className = "h-16 rounded-lg" }) {
  const s = getBannerStyle(sku);
  return (
    <div
      className={`relative overflow-hidden border border-white/10 ${className}`}
      style={{ background: `linear-gradient(135deg, ${s.from}, ${s.via}, ${s.to})` }}
    >
      <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at 30% 30%, ${s.glow}, transparent 70%)` }} />
    </div>
  );
}
