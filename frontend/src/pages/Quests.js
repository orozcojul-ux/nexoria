import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Scroll, Sparkles, Coins, Crosshair, Feather, Target } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";
import {
  PageShell,
  PremiumCard,
  PremiumButton,
} from "@/components/ui-premium";
import { usePageBanner } from "@/lib/page-banners";
import { useI18n } from "@/contexts/I18nContext";

const TAB_KEYS = { daily: "quests.tab.daily", weekly: "quests.tab.weekly", monthly: "quests.tab.monthly" };

export default function Quests() {
  const banner = usePageBanner("quests");
  const { t } = useI18n();
  const [quests, setQuests] = useState([]);
  const [tab, setTab] = useState("daily");
  const [oracleQuest, setOracleQuest] = useState(null);
  const [loadingOracle, setLoadingOracle] = useState(false);

  const load = async () => {
    const { data } = await api.get("/quests");
    setQuests(data);
  };
  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("focus", onRefresh);
    window.addEventListener("nexoria:profile:updated", onRefresh);
    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("nexoria:profile:updated", onRefresh);
    };
  }, []);

  const generateOracleQuest = async () => {
    setLoadingOracle(true);
    try {
      const { data } = await api.post("/oracle/quest");
      sfx.oracle();
      setOracleQuest(data);
    } catch { toast.error(t("quests.oracle.error")); }
    finally { setLoadingOracle(false); }
  };

  const filtered = quests.filter((q) => q.type === tab);
  const stats = useMemo(() => {
    const all = quests.filter((q) => q.type === tab);
    const done = all.filter((q) => q.completed).length;
    const xp = all.reduce((s, q) => s + (q.completed ? q.xp : 0), 0);
    const aether = all.reduce((s, q) => s + (q.completed ? q.aether : 0), 0);
    return { total: all.length, done, xp, aether };
  }, [quests, tab]);

  return (
    <PageShell
      wide
      testid="quests-page"
      banner={banner}
    >

      <div className="quest-summary-grid mb-5">
        {[
          { label: t("quests.stat.total"), value: stats.total, icon: Target, color: "text-amber-400" },
          { label: t("quests.stat.done"), value: stats.done, icon: Check, color: "text-emerald-400" },
          { label: t("quests.stat.xp"), value: `+${stats.xp}`, icon: Sparkles, color: "text-cyan-400" },
          { label: t("quests.stat.aether"), value: `+${stats.aether}`, icon: Coins, color: "text-yellow-400" },
        ].map((s) => {
          const Ico = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-white/8 bg-black/25 p-3 text-center">
              <Ico className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <div className="font-mono-stat font-bold text-lg text-white">{s.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="hub-page-header mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-display font-bold text-white">{t("quests.cycle")} {t(TAB_KEYS[tab])}</span>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="quest-tabs">
            {Object.entries(TAB_KEYS).map(([id, key]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                data-testid={`tab-${id}`}
                className={`hub-tab-pill ${tab === id ? "hub-tab-pill--active" : ""}`}
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-8">
        {filtered.length === 0 && (
          <PremiumCard tone="cyan" className="col-span-2 p-10 text-center text-zinc-500 italic text-sm">
            {t("quests.empty")}
          </PremiumCard>
        )}
        {filtered.map((q, i) => {
          const pct = Math.min(100, (q.progress / q.target) * 100);
          return (
            <motion.div
              key={q.user_id_quest_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <PremiumCard
                tone={q.completed ? "cyan" : "gold"}
                testid={`quest-${q.quest_id}`}
                className="relative overflow-hidden h-full"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${q.completed ? "bg-cyan-500/15" : "bg-amber-500/15"}`}>
                    {q.completed ? <Check className="w-5 h-5 text-cyan-400" /> : <Feather className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-base text-white">{q.name}</div>
                    <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{q.description}</div>
                    <div className="mt-3 flex justify-between text-[10px] font-mono-stat uppercase tracking-wider text-zinc-500">
                      <span>{t("quests.progress")}</span>
                      <span className="text-cyan-300">{q.progress}/{q.target}</span>
                    </div>
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full ${q.completed ? "bg-gradient-to-r from-emerald-500 to-cyan-400" : "bg-gradient-to-r from-amber-600 to-amber-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex gap-3 text-[11px] font-mono-stat">
                      <span className="text-cyan-300 flex items-center gap-1"><Sparkles className="w-3 h-3" />+{q.xp} XP</span>
                      <span className="text-yellow-400 flex items-center gap-1"><Coins className="w-3 h-3" />+{q.aether}</span>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-violet-400 font-bold flex items-center gap-1.5">
              <Scroll className="w-3.5 h-3.5" /> {t("quests.oracle.title")}
            </div>
            <p className="text-xs text-zinc-500 mt-1">{t("quests.oracle.subtitle")}</p>
          </div>
          <PremiumButton
            variant="violet"
            size="sm"
            icon={Sparkles}
            onClick={generateOracleQuest}
            disabled={loadingOracle}
            testid="generate-oracle-quest-btn"
          >
            {loadingOracle ? t("quests.oracle.writing") : t("quests.oracle.generate_btn")}
          </PremiumButton>
        </div>
        {oracleQuest && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg border border-violet-500/25 bg-black/30"
            data-testid="oracle-quest-result"
          >
            <div className="font-display font-bold text-lg text-violet-100">{oracleQuest.name}</div>
            <div className="text-sm text-violet-100/75 mt-1">{oracleQuest.description}</div>
            <div className="mt-2 flex gap-4 text-xs font-mono-stat">
              <span className="text-cyan-300">+{oracleQuest.xp} XP</span>
              <span className="text-yellow-400">+{oracleQuest.aether} ✦</span>
            </div>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}
