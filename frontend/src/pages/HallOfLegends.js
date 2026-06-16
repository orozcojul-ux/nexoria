import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Crown, Sparkles } from "lucide-react";
import api from "@/lib/api";
import HeroName from "@/components/HeroName";
import { usePageBanner } from "@/lib/page-banners";

export default function HallOfLegends() {
  const banner = usePageBanner("legends");
  const [legends, setLegends] = useState([]);

  useEffect(() => {
    api.get("/hall-of-legends").then((r) => setLegends(r.data));
  }, []);

  return (
    <PageShell
      wide
      testid="legends-page"
      banner={banner}
    >

      <PremiumSection title="Hall of Legends" subtitle="Top 10 mondial" icon={Flame} tone="gold">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {legends.map((u, i) => (
            <motion.div
              key={u.user_id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <PremiumCard tone={i === 0 ? "gold" : "violet"} testid={`legend-${i}`}>
                {i < 3 && (
                  <div className="absolute top-4 right-4">
                    <Crown className={`w-6 h-6 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-200" : "text-orange-400"}`} />
                  </div>
                )}
                <div className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold mb-2">#{i + 1}</div>
                <Link to={`/profile/${u.username}`} className="block">
                  <HeroName user={u} size="lg" showIcon={false} />
                </Link>
                <div className="text-sm text-violet-300 mt-1">{u.class_name}</div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono-stat">
                  <div><span className="text-zinc-500">Niveau</span> <span className="text-cyan-300 font-bold">{u.level}</span></div>
                  <div><span className="text-zinc-500">Rang</span> <span className="text-violet-300 font-bold">{u.rank}</span></div>
                  <div><span className="text-zinc-500">XP</span> <span className="text-cyan-300 font-bold">{u.xp?.toLocaleString()}</span></div>
                  <div><span className="text-zinc-500">Réputation</span> <span className="text-yellow-300 font-bold">{u.reputation}</span></div>
                </div>
                {i === 0 && (
                  <div className="mt-3 flex items-center gap-1 text-[10px] uppercase tracking-widest text-yellow-300 font-bold">
                    <Sparkles className="w-3 h-3" /> Élu du Panthéon
                  </div>
                )}
              </PremiumCard>
            </motion.div>
          ))}
        </div>
      </PremiumSection>
    </PageShell>
  );
}
