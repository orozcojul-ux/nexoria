import React, { useRef, useEffect, useState } from "react";
import { Send, X, Smile, Trash2, ScrollText, Palette, Crown, HelpCircle, VolumeX } from "lucide-react";
import { toast } from "sonner";
import HeroName from "@/components/HeroName";
import { isStaffRole } from "@/lib/staff-roles";
import {
  nexusChatColors,
  NEXUS_CHAT_EMOJIS,
  NEXUS_VIP_COLOR_PRESETS,
  NEXUS_CHAT_COMMANDS_HINT,
} from "@/lib/nexusChatColors";

export default function NexusChatDock({
  open,
  onOpen,
  onClose,
  onOpenHelp,
  roomName = "Salle",
  messages = [],
  text,
  onTextChange,
  onSubmit,
  chatEndRef,
  viewerRole = "user",
  chatMuted = false,
  chatMutedUntil = null,
  isVip = false,
  chatColor = null,
  onSetChatColor,
  onDeleteMessage,
  onInsertEmoji,
}) {
  const inputRef = useRef(null);
  const [colorOpen, setColorOpen] = useState(false);

  const isStaff = isStaffRole(viewerRole);
  const writeBlocked = chatMuted && !isStaff;

  useEffect(() => {
    if (open && inputRef.current && !writeBlocked) {
      inputRef.current.focus();
    }
  }, [open, writeBlocked]);

  const handleKeyDown = (e) => {
    if (writeBlocked) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
    if (e.key === "Escape") onClose?.();
  };

  const pickColor = async (hex) => {
    try {
      await onSetChatColor?.(hex);
      setColorOpen(false);
    } catch {
      toast.error("Impossible de changer la couleur.");
    }
  };

  if (!open) {
    return (
      <div className="nexus-chat-dock nexus-chat-dock--collapsed" data-testid="nexus-chat">
        <button type="button" className="nexus-chat-bar" onClick={onOpen}>
          <ScrollText className="w-4 h-4 text-amber-200/70" />
          <span>{writeBlocked ? "Tchat en lecture seule (salle muette)" : "Clique ici pour tchatter"}</span>
        </button>
      </div>
    );
  }

  const mutedUntilLabel = chatMutedUntil
    ? new Date(chatMutedUntil).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="nexus-chat-dock nexus-chat-dock--open" data-testid="nexus-chat">
      <div className="nexus-chat-panel">
        <div className="nexus-chat-panel-head">
          <div>
            <span className="nexus-chat-panel-title">{roomName}</span>
            <span className="nexus-chat-panel-sub">
              {NEXUS_CHAT_COMMANDS_HINT}
              {isStaff && " · Gardien : /kickall /muteall /clearchat"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onOpenHelp} className="nexus-icon-btn" title="Aide commandes (/help)">
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={onClose} className="nexus-icon-btn" aria-label="Fermer le tchat">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="nexus-chat-log" data-testid="nexus-chat-log">
          {messages.length === 0 ? (
            <p className="nexus-chat-empty">
              Aucun écho dans <em>{roomName}</em> — soyez le premier à parler.
            </p>
          ) : (
            messages.map((m) => {
              const customColor = m.chat_color || m.nexus_chat_color;
              const colors = nexusChatColors(m.role, {
                is_vip: m.is_vip,
                is_nexus_supreme: m.is_nexus_supreme,
                rank: m.rank,
                active_title: m.active_title,
                chat_color: customColor,
                nexus_chat_color: customColor,
              });
              const hasCustom = !!customColor;
              return (
                <div
                  key={m.message_id || `${m.ts}-${m.user_id}`}
                  className="nexus-chat-line group"
                  style={{
                    background: colors.badge,
                    borderLeftColor: colors.name,
                    borderLeftWidth: hasCustom ? 3 : 2,
                  }}
                >
                  <span className="nexus-chat-line-meta">
                    <HeroName
                      user={{
                        username: m.username,
                        role: m.role,
                        level: m.level,
                        rank: m.rank,
                        is_vip: m.is_vip,
                        is_nexus_supreme: m.is_nexus_supreme,
                      }}
                      size="xs"
                      showIcon={false}
                      nameColor={hasCustom ? colors.name : null}
                    />
                    {m.level != null && (
                      <span className="nexus-chat-level" style={{ color: colors.name }}>niv.{m.level}</span>
                    )}
                  </span>
                  <p className="nexus-chat-line-text" style={{ color: colors.text }}>
                    {m.content || m.text}
                  </p>
                  {isStaff && m.message_id && !String(m.message_id).startsWith("legacy_") && !String(m.message_id).startsWith("local_") && onDeleteMessage && (
                    <button
                      type="button"
                      title="Supprimer"
                      onClick={() => onDeleteMessage(m.message_id)}
                      className="nexus-chat-delete opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {writeBlocked && (
          <div className="nexus-chat-muted-notice" data-testid="nexus-chat-muted-notice">
            <VolumeX className="w-4 h-4 shrink-0" />
            <span>
              La salle est réduite au silence — vous pouvez lire le tchat, pas écrire.
              {mutedUntilLabel ? ` (fin ~${mutedUntilLabel})` : ""}
            </span>
          </div>
        )}

        {isVip && !writeBlocked && (
          <div className="nexus-chat-vip-colors">
            <button
              type="button"
              className="nexus-chat-vip-toggle"
              onClick={() => setColorOpen((v) => !v)}
              title="Couleur de tchat VIP"
            >
              <Crown className="w-3 h-3 text-amber-300" />
              <Palette className="w-3 h-3" />
              <span>Couleur VIP</span>
              {chatColor && (
                <span className="nexus-chat-vip-current" style={{ background: chatColor }} />
              )}
            </button>
            {colorOpen && (
              <div className="nexus-chat-vip-swatches">
                {NEXUS_VIP_COLOR_PRESETS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    className={`nexus-chat-vip-swatch${chatColor === c.hex ? " nexus-chat-vip-swatch--active" : ""}`}
                    style={{ background: c.hex }}
                    onClick={() => pickColor(c.hex)}
                  />
                ))}
                <button
                  type="button"
                  className="nexus-chat-vip-reset"
                  onClick={() => pickColor(null)}
                >
                  Défaut
                </button>
              </div>
            )}
          </div>
        )}

        {!writeBlocked && (
          <div className="nexus-chat-emoji-strip">
            {NEXUS_CHAT_EMOJIS.map((e) => (
              <button key={e} type="button" className="nexus-chat-emoji-btn" onClick={() => onInsertEmoji?.(e)}>
                {e}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={writeBlocked ? (e) => e.preventDefault() : onSubmit}
          className={`nexus-chat-input-row${writeBlocked ? " nexus-chat-input-row--disabled" : ""}`}
        >
          <button type="button" className="nexus-icon-btn" title="Émojis" disabled={writeBlocked} onClick={() => onInsertEmoji?.("✨")}>
            <Smile className="w-3.5 h-3.5" />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => !writeBlocked && onTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={300}
            rows={1}
            disabled={writeBlocked}
            readOnly={writeBlocked}
            placeholder={writeBlocked ? "Salle muette — lecture seule" : `/help · Parler dans ${roomName}…`}
            className="nexus-chat-input nexus-chat-textarea"
            data-testid="nexus-chat-input"
            autoCapitalize="sentences"
            autoCorrect="off"
            spellCheck={!writeBlocked}
          />
          <button
            type="submit"
            disabled={writeBlocked || !text.trim()}
            data-testid="nexus-chat-send"
            className="nexus-chat-send-btn"
            aria-label="Envoyer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
