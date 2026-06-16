import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Shield, X, User, Globe, Megaphone, ScrollText } from "lucide-react";
import GmPlayerActions from "./GmPlayerActions";
import GmWorldControls from "./GmWorldControls";
import GmBroadcastPanel from "./GmBroadcastPanel";
import GmLogsStream from "./GmLogsStream";
import { GM_TABS } from "./constants";
import "./NexusGm.css";
import "@/components/nexus-hud/NexusHud.css";

const TAB_ICONS = {
  player: User,
  world: Globe,
  broadcast: Megaphone,
  logs: ScrollText,
};

export default function GmPanel({
  open, onClose, target, clearTarget, weather, room, gm, liveLogs,
  requestTilePickFor, announceText, setAnnounceText, submitAnnounce,
  popupTitle, setPopupTitle, popupBody, setPopupBody, submitPopup,
  spawnForm, setSpawnForm, gmInvisible, toggleInvisible,
  godmode, toggleGodmode, onBanClick, onInspect,
}) {
  const [tab, setTab] = useState("player");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="nexus-gm-backdrop"
          onClick={onClose}
          data-testid="gm-panel"
        >
          <motion.div
            initial={{ scale: 0.94, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 20 }}
            className="nexus-gm-shell"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="nexus-gm-head">
              <div className="nexus-gm-brand">
                <div className="nexus-gm-brand-mark">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="nexus-gm-title">Panneau du Gardien</h2>
                  <p className="nexus-gm-sub">Sentinelle · Nexus Online</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="nexus-icon-btn" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </header>

            <nav className="nexus-gm-tabs">
              {GM_TABS.map((t) => {
                const Ico = TAB_ICONS[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    data-testid={`gm-tab-${t.id}`}
                    className={`nexus-gm-tab ${tab === t.id ? "nexus-gm-tab--active" : ""}`}
                  >
                    {Ico && <Ico className="w-3 h-3" />}
                    {t.label}
                  </button>
                );
              })}
            </nav>

            <div className="nexus-gm-body">
              {tab === "player" && (
                <GmPlayerActions
                  target={target}
                  clearTarget={clearTarget}
                  gm={gm}
                  requestTilePickFor={requestTilePickFor}
                  onBanClick={onBanClick}
                  onInspect={onInspect}
                />
              )}
              {tab === "world" && (
                <GmWorldControls
                  weather={weather}
                  room={room}
                  gm={gm}
                  requestTilePickFor={requestTilePickFor}
                  spawnForm={spawnForm}
                  setSpawnForm={setSpawnForm}
                  gmInvisible={gmInvisible}
                  toggleInvisible={toggleInvisible}
                  godmode={godmode}
                  toggleGodmode={toggleGodmode}
                />
              )}
              {tab === "broadcast" && (
                <GmBroadcastPanel
                  announceText={announceText}
                  setAnnounceText={setAnnounceText}
                  submitAnnounce={submitAnnounce}
                  popupTitle={popupTitle}
                  setPopupTitle={setPopupTitle}
                  popupBody={popupBody}
                  setPopupBody={setPopupBody}
                  submitPopup={submitPopup}
                />
              )}
              {tab === "logs" && <GmLogsStream liveLogs={liveLogs} />}
            </div>

            <footer className="nexus-gm-foot">
              <Shield className="w-3 h-3 inline mr-1 text-amber-600/60" />
              Toutes les actions sont consignées dans le Codex
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
