import React from "react";
import { Link } from "react-router-dom";
import { Shield, EyeOff, Users, Scroll, ArrowLeft } from "lucide-react";
import { PageShell, PremiumButton } from "@/components/ui-premium";
import { useI18n } from "@/contexts/I18nContext";
import { getUserAvatarUrl } from "@/lib/user-avatar";

export default function ProfileHiddenView({
  username,
  displayName,
  reason = "private",
  avatarUrl,
  bio,
  rank,
  roleLabel,
}) {
  const { t } = useI18n();
  const label = displayName || username;
  const isSentinel = reason === "official_sentinel";

  const kicker = t(`profile.hidden.${reason}.kicker`);
  const title = t(`profile.hidden.${reason}.title`);
  const lines = [0, 1].map((i) => t(`profile.hidden.${reason}.line${i + 1}`)).filter(Boolean);
  const footer = t(`profile.hidden.${reason}.footer`);
  const Icon = isSentinel ? Shield : reason === "friends_only" ? Users : EyeOff;
  const accent = isSentinel ? "#F97316" : "#8B5CF6";
  const avatar = avatarUrl ? getUserAvatarUrl({ avatar_url: avatarUrl }) : null;

  return (
    <PageShell testid="profile-hidden-page">
      <div className="profile-hidden-scene">
        <div className="profile-hidden-runes" aria-hidden />
        <div className="profile-hidden-veil" aria-hidden />

        <div
          className="profile-hidden-card"
          style={isSentinel ? { borderColor: "rgba(249,115,22,0.25)" } : undefined}
        >
          <div
            className="profile-hidden-emblem"
            style={isSentinel ? { borderColor: "rgba(249,115,22,0.35)", background: "rgba(249,115,22,0.08)" } : undefined}
          >
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <Shield className="w-8 h-8" style={{ color: accent }} />
            )}
          </div>
          <div
            className="text-[9px] uppercase tracking-[0.35em] font-bold mb-2"
            style={{ color: isSentinel ? "rgba(253,186,116,0.9)" : "rgba(34,211,238,0.8)" }}
          >
            {kicker}
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white mb-1">
            {title}
          </h1>
          <p className="text-sm font-semibold mb-1" style={{ color: isSentinel ? "#fdba74" : "rgba(196,181,253,0.9)" }}>
            {label}
          </p>
          <p className="text-xs text-zinc-500 mb-4">@{username}</p>
          {(roleLabel || rank) && isSentinel && (
            <p className="text-[11px] uppercase tracking-widest text-orange-300/80 font-bold mb-4">
              {roleLabel || rank}
            </p>
          )}

          <div className="profile-hidden-scroll">
            <Scroll className="w-4 h-4 text-amber-400/80 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-zinc-400 leading-relaxed italic">
              {bio && isSentinel && <p className="not-italic text-zinc-300">{bio}</p>}
              {lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6 text-[10px] uppercase tracking-[0.25em] text-zinc-600">
            <Icon className="w-3.5 h-3.5" />
            {footer}
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link to="/community">
              <PremiumButton variant="ghost" size="sm" icon={ArrowLeft}>
                {t("profile.hidden.backCommunity")}
              </PremiumButton>
            </Link>
            {reason === "friends_only" && (
              <Link to="/friends">
                <PremiumButton variant="cyan" size="sm" icon={Users}>
                  {t("profile.hidden.friendsCta")}
                </PremiumButton>
              </Link>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
