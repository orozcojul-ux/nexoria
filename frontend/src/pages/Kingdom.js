import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import { Lock, Coins, Castle as CastleIcon } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import {
  PageShell,
  PremiumSection,
  PremiumCard,
  PremiumButton,
} from "@/components/ui-premium";
import { usePageBanner } from "@/lib/page-banners";

export default function Kingdom() {
  const { user, refresh } = useAuth();
  const banner = usePageBanner("kingdom", { name: user?.username, aether: user?.aether });
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    api.get("/game/buildings").then((r) => setBuildings(r.data));
  }, []);

  if (!user) return null;

  const upgrade = async (id) => {
    try {
      const { data } = await api.post(`/kingdom/upgrade/${id}`);
      sfx.success();
      toast.success(`Édifice ennobli au rang ${data.kingdom[id].level} (-${data.cost} Écus)`);
      await refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Les fondations résistent..."); }
  };

  const kingdom = user.kingdom || {};

  return (
    <PageShell
      wide
      testid="kingdom-page"
      banner={banner}
    >

      <PremiumSection title="Édifices" subtitle="Développez votre domaine" icon={CastleIcon} tone="gold">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="buildings-grid">
          {buildings.map((b, i) => {
            const I = Lucide[b.icon] || Lucide.Castle;
            const data = kingdom[b.id] || { level: 0 };
            const locked = user.level < b.unlock_level;
            const cost = 100 * (data.level + 1);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <PremiumCard tone={locked ? "violet" : "cyan"} className={locked ? "opacity-60" : ""} testid={`building-${b.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="relative w-14 h-14">
                      <I className="w-8 h-8 text-cyan-400" style={{ filter: "drop-shadow(0 0 10px rgba(0,229,255,0.7))" }} />
                    </div>
                    {locked ? <Lock className="w-4 h-4 text-zinc-500" /> : (
                      <div className="text-right">
                        <div className="font-mono-stat text-3xl font-bold text-cyan-300 leading-none">{data.level}</div>
                        <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-bold mt-1">Rang</div>
                      </div>
                    )}
                  </div>
                  <div className="font-display font-bold text-xl">{b.name}</div>
                  <div className="text-sm text-zinc-400 mt-1 mb-4">{b.description}</div>
                  {locked ? (
                    <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold border-t border-white/5 pt-3">
                      Sceau levé au niveau {b.unlock_level}
                    </div>
                  ) : (
                    <PremiumButton variant="cyan" size="sm" icon={Coins} className="w-full" onClick={() => upgrade(b.id)} testid={`upgrade-${b.id}`}>
                      Ennoblir ({cost} Écus)
                    </PremiumButton>
                  )}
                </PremiumCard>
              </motion.div>
            );
          })}
        </div>
      </PremiumSection>
    </PageShell>
  );
}
