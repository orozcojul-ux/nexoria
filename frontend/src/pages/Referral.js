import React, { useEffect, useState } from "react";
import { Copy, Check, Gift, Users, Coins, Award, Crown, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PremiumCard, PremiumButton } from "@/components/ui-premium";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";

const MILESTONE_ICONS = {
  1: Coins,
  3: Award,
  10: Crown,
  25: MessageSquare,
};

export default function Referral() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/referral/me")
      .then((r) => { if (active) setData(r.data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const copyLink = async () => {
    if (!data?.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      sfx.click?.();
      toast.success("Lien de parrainage copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const count = data?.count ?? 0;
  const milestones = data?.milestones ?? [];

  return (
    <PageShell testid="referral-page">
      <PremiumCard tone="violet">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border border-violet-500/30 shrink-0"
            style={{ boxShadow: "0 0 24px rgba(139,92,246,0.35)" }}
          >
            <Gift className="w-7 h-7 text-violet-300" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white">Parrainage</h1>
            <p className="text-sm text-zinc-400">
              Invite des héros à rejoindre NEXORIA et débloque des récompenses exclusives.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4 mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold mb-2">
            Ton lien de parrainage
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              readOnly
              value={loading ? "Chargement…" : data?.link || ""}
              onFocus={(e) => e.target.select()}
              className="flex-1 bg-[#0A0613] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono-stat focus:outline-none focus:border-violet-500/50"
              data-testid="referral-link"
            />
            <PremiumButton
              variant="violet"
              icon={copied ? Check : Copy}
              onClick={copyLink}
              testid="referral-copy"
            >
              {copied ? "Copié" : "Copier"}
            </PremiumButton>
          </div>
          {data?.code && (
            <div className="text-xs text-zinc-500 mt-2">
              Code : <span className="text-zinc-300 font-mono-stat">{data.code}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-cyan-300" />
          <div className="text-sm text-zinc-300">
            Héros parrainés : <span className="font-display font-bold text-cyan-200">{count}</span>
          </div>
        </div>

        <div className="space-y-3">
          {milestones.map((m) => {
            const Icon = MILESTONE_ICONS[m.threshold] || Gift;
            return (
              <div
                key={m.threshold}
                className={`flex items-center gap-4 rounded-xl border p-3.5 transition-colors ${
                  m.claimed
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : m.reached
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-white/10 bg-black/20"
                }`}
                data-testid={`referral-milestone-${m.threshold}`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${
                    m.claimed
                      ? "border-emerald-400/50 text-emerald-300"
                      : m.reached
                      ? "border-amber-400/50 text-amber-300"
                      : "border-white/15 text-zinc-500"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-sm text-white">
                    Invite {m.threshold} {m.threshold > 1 ? "amis" : "ami"}
                  </div>
                  <div className="text-xs text-zinc-400">{m.label}</div>
                </div>
                <div className="text-xs font-bold shrink-0">
                  {m.claimed ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Obtenu
                    </span>
                  ) : (
                    <span className="text-zinc-500">{count}/{m.threshold}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PremiumCard>
    </PageShell>
  );
}
