import React from "react";
import { Link } from "react-router-dom";
import { Shield, EyeOff, Users, Scroll, ArrowLeft } from "lucide-react";
import { PageShell, PremiumButton } from "@/components/ui-premium";

const COPY = {
  private: {
    kicker: "Voile d'ombre",
    title: "Profil scellé",
    lines: [
      "Ce héros a drapé son identité derrière un sort de dissimulation.",
      "Les annales ne révèlent rien à quiconque n'est pas invité dans son cercle.",
    ],
    icon: EyeOff,
  },
  friends_only: {
    kicker: "Pacte de confiance",
    title: "Réservé aux compagnons",
    lines: [
      "Seuls les alliés liés par le pacte d'amitié peuvent contempler ce profil.",
      "Forgez un lien de fraternité pour percer le voile.",
    ],
    icon: Users,
  },
};

export default function ProfileHiddenView({ username, displayName, reason = "private" }) {
  const cfg = COPY[reason] || COPY.private;
  const Icon = cfg.icon;
  const label = displayName || username;

  return (
    <PageShell testid="profile-hidden-page">
      <div className="profile-hidden-scene">
        <div className="profile-hidden-runes" aria-hidden />
        <div className="profile-hidden-veil" aria-hidden />

        <div className="profile-hidden-card">
          <div className="profile-hidden-emblem">
            <Shield className="w-8 h-8 text-violet-300" />
          </div>
          <div className="text-[9px] uppercase tracking-[0.35em] text-cyan-400/80 font-bold mb-2">
            {cfg.kicker}
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white mb-1">
            {cfg.title}
          </h1>
          <p className="text-sm text-violet-200/90 font-semibold mb-4">
            @{username}
            {displayName && displayName !== username ? ` · ${label}` : ""}
          </p>

          <div className="profile-hidden-scroll">
            <Scroll className="w-4 h-4 text-amber-400/80 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-zinc-400 leading-relaxed italic">
              {cfg.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6 text-[10px] uppercase tracking-[0.25em] text-zinc-600">
            <Icon className="w-3.5 h-3.5" />
            Profil masqué par le héros
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link to="/feed">
              <PremiumButton variant="ghost" size="sm" icon={ArrowLeft}>
                Retour à l'accueil
              </PremiumButton>
            </Link>
            {reason === "friends_only" && (
              <Link to="/friends">
                <PremiumButton variant="cyan" size="sm" icon={Users}>
                  Mes compagnons
                </PremiumButton>
              </Link>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
