import React from "react";
import {
  Ban, Eye, Footprints, Lock, MapPin, Search, Snowflake, Volume2, VolumeX, Crown,
} from "lucide-react";
import { toast } from "sonner";
import HeroName from "@/components/HeroName";
import GmBtn from "./GmBtn";

export default function GmPlayerActions({
  target, clearTarget, gm, requestTilePickFor, onBanClick, onInspect,
}) {
  if (!target) {
    return (
      <div className="nexus-gm-empty">
        Cliquez sur un héros (canvas ou liste) pour le cibler, ou utilisez le menu contextuel (clic droit).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="nexus-gm-section nexus-gm-section--gold">
        <div className="nexus-gm-section-head">
          <Crown className="w-3.5 h-3.5 text-amber-300" />
          <span className="nexus-gm-section-title">Cible sélectionnée</span>
        </div>
        <div className="nexus-gm-section-body space-y-3">
          <div className="nexus-gm-target-card">
            <div>
              <HeroName user={target} />
              <div className="text-xs text-zinc-400 mt-0.5">
                {target.class_name} · niv. {target.level} · ({target.tx}, {target.ty})
              </div>
            </div>
            <button type="button" onClick={clearTarget} className="text-xs text-zinc-500 hover:text-white">
              Changer
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <GmBtn icon={Footprints} label="TP vers" color="cyan"
              onClick={() => { gm.tpToPlayer(target.user_id); toast.success(`Téléporté vers ${target.username}`); }}
              testid="gm-tp-to" />
            <GmBtn icon={MapPin} label="TP ici" color="cyan"
              onClick={() => { gm.tpPlayerToMe(target.user_id); toast.success(`${target.username} convoqué`); }}
              testid="gm-tp-here" />
            <GmBtn icon={Footprints} label="Téléporter…" color="purple"
              onClick={() => requestTilePickFor("teleport", target)} testid="gm-teleport" />
            <GmBtn icon={Search} label="Inspecter" color="cyan" onClick={onInspect} testid="gm-inspect" />
            <GmBtn icon={Eye} label="Observer" color="purple"
              onClick={() => gm.observe(target.user_id)} testid="gm-observe" />
            <GmBtn icon={target.muted ? Volume2 : VolumeX}
              label={target.muted ? "Voix" : "Muet"} color="purple"
              onClick={() => gm.mute(target.user_id, !target.muted)} testid="gm-mute" />
            <GmBtn icon={Snowflake}
              label={target.frozen ? "Libérer" : "Figer"} color="cyan"
              onClick={() => gm.freeze(target.user_id, !target.frozen)} testid="gm-freeze" />
            <GmBtn icon={Lock} label="Prison 30min" color="orange"
              onClick={() => gm.prison(target.user_id, 30)} testid="gm-prison" />
            <GmBtn icon={Footprints} label="Expulser" color="orange"
              onClick={() => { gm.kick(target.user_id, "Décret du Conseil"); toast.success("Expulsion envoyée"); }}
              testid="gm-kick" />
            <GmBtn icon={Ban} label="Bannir…" color="red" onClick={onBanClick} testid="gm-ban" />
          </div>

          <div className="pt-3 border-t border-white/6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="nexus-gm-label">Donner / Retirer Écus</label>
              <div className="flex gap-1">
                <input type="number" placeholder="±montant" data-testid="gm-aether-amount"
                  className="nexus-gm-input flex-1 font-mono"
                  id={`aether-${target.user_id}`} />
                <button type="button" onClick={() => {
                  const el = document.getElementById(`aether-${target.user_id}`);
                  const v = parseInt(el?.value, 10);
                  if (!v) { toast.error("Montant invalide"); return; }
                  gm.giveAether(target.user_id, v);
                  if (el) el.value = "";
                }} data-testid="gm-give-aether" className="nexus-gm-btn nexus-gm-btn--gold px-3">
                  ⟡
                </button>
              </div>
            </div>
            <div>
              <label className="nexus-gm-label">Donner relique</label>
              <div className="flex gap-1">
                <input placeholder="Nom de la relique" data-testid="gm-item-name"
                  className="nexus-gm-input flex-1"
                  id={`itemname-${target.user_id}`} />
                <button type="button" onClick={() => {
                  const el = document.getElementById(`itemname-${target.user_id}`);
                  const v = (el?.value || "").trim();
                  if (!v) { toast.error("Nom requis"); return; }
                  gm.giveItem(target.user_id, { name: v, rarity: "rare", icon: "✨" });
                  if (el) el.value = "";
                }} data-testid="gm-give-item" className="nexus-gm-btn nexus-gm-btn--violet px-3">
                  ✨
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
