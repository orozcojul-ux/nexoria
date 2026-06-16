import React from "react";
import { Link } from "react-router-dom";
import { Hammer, ArrowLeft } from "lucide-react";
import { PageShell, PremiumCard, PremiumButton } from "@/components/ui-premium";

export default function UnderConstruction({ title }) {
  return (
    <PageShell testid="under-construction-page">
      <PremiumCard tone="violet" className="text-center">
        <div className="flex flex-col items-center gap-5 py-10 px-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center border border-amber-500/30"
            style={{ boxShadow: "0 0 28px rgba(245,158,11,0.35)" }}
          >
            <Hammer className="w-9 h-9 text-amber-300" />
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
            {title || "Page en cours de construction"}
          </h1>
          <p className="text-zinc-400 max-w-md leading-relaxed">
            Cette section n'est pas encore disponible. Nos artisans forgent encore
            cette partie du royaume — reviens bientôt&nbsp;!
          </p>
          <Link to="/">
            <PremiumButton variant="violet" icon={ArrowLeft} testid="under-construction-back">
              Retour à l'accueil
            </PremiumButton>
          </Link>
        </div>
      </PremiumCard>
    </PageShell>
  );
}
