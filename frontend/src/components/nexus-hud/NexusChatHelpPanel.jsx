import React from "react";
import { motion } from "framer-motion";
import { X, ScrollText, Crown, Shield } from "lucide-react";
import { getNexusChatHelpSections } from "@/lib/nexusChatHelp";

export default function NexusChatHelpPanel({ open, onClose, role = "user", isVip = false, isNexusSupreme = false }) {
  if (!open) return null;

  const sections = getNexusChatHelpSections({ role, isVip, isNexusSupreme });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="nexus-chat-help-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="nexus-chat-help-panel"
        onClick={(e) => e.stopPropagation()}
        data-testid="nexus-chat-help-panel"
      >
        <header className="nexus-chat-help-head">
          <div className="nexus-chat-help-brand">
            <ScrollText className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="nexus-chat-help-title">Grimoire du Tchat</h3>
              <p className="nexus-chat-help-sub">Commandes du Nexus Online</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="nexus-icon-btn" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="nexus-chat-help-body">
          {sections.map((section) => (
            <section key={section.id} className={`nexus-chat-help-section${section.muted ? " nexus-chat-help-section--muted" : ""}`}>
              <h4 className="nexus-chat-help-section-title">
                <span>{section.icon}</span>
                {section.title}
                {section.id === "vip" && <Crown className="w-3.5 h-3.5 text-amber-300" />}
                {section.id === "staff-mod" && <Shield className="w-3.5 h-3.5 text-orange-300" />}
              </h4>
              <ul className="nexus-chat-help-list">
                {section.commands.map((c) => (
                  <li key={c.cmd} className="nexus-chat-help-row">
                    <code className="nexus-chat-help-cmd">{c.cmd}</code>
                    <span className="nexus-chat-help-desc">{c.desc}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="nexus-chat-help-foot">
          Tape une commande dans le tchat puis Entrée · Échap pour fermer
        </footer>
      </motion.div>
    </motion.div>
  );
}
