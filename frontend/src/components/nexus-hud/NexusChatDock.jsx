import React, { useRef, useEffect } from "react";
import { Send, X, Smile, Trash2, ScrollText } from "lucide-react";
import HeroName from "@/components/HeroName";
import { nexusChatColors, NEXUS_CHAT_EMOJIS } from "@/lib/nexusChatColors";

export default function NexusChatDock({
  open,
  onOpen,
  onClose,
  roomName = "Salle",
  messages = [],
  text,
  onTextChange,
  onSubmit,
  chatEndRef,
  isStaff = false,
  onDeleteMessage,
  onInsertEmoji,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
    if (e.key === "Escape") onClose?.();
  };

  if (!open) {
    return (
      <div className="nexus-chat-dock nexus-chat-dock--collapsed" data-testid="nexus-chat">
        <button type="button" className="nexus-chat-bar" onClick={onOpen}>
          <ScrollText className="w-4 h-4 text-amber-200/70" />
          <span>Clique ici pour tchatter</span>
        </button>
      </div>
    );
  }

  return (
    <div className="nexus-chat-dock nexus-chat-dock--open" data-testid="nexus-chat">
      <div className="nexus-chat-panel">
        <div className="nexus-chat-panel-head">
          <div>
            <span className="nexus-chat-panel-title">{roomName}</span>
            <span className="nexus-chat-panel-sub">Tchat de la salle</span>
          </div>
          <button type="button" onClick={onClose} className="nexus-icon-btn" aria-label="Fermer le tchat">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="nexus-chat-log" data-testid="nexus-chat-log">
          {messages.length === 0 ? (
            <p className="nexus-chat-empty">
              Aucun écho dans <em>{roomName}</em> — soyez le premier à parler.
            </p>
          ) : (
            messages.map((m) => {
              const colors = nexusChatColors(m.role, { is_vip: m.is_vip, rank: m.rank, active_title: m.active_title });
              return (
                <div
                  key={m.message_id || `${m.ts}-${m.user_id}`}
                  className="nexus-chat-line group"
                  style={{ background: colors.badge }}
                >
                  <span className="nexus-chat-line-meta">
                    <HeroName
                      user={{ username: m.username, role: m.role, level: m.level, rank: m.rank }}
                      size="xs"
                      showIcon={false}
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

        <div className="nexus-chat-emoji-strip">
          {NEXUS_CHAT_EMOJIS.map((e) => (
            <button key={e} type="button" className="nexus-chat-emoji-btn" onClick={() => onInsertEmoji?.(e)}>
              {e}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="nexus-chat-input-row">
          <button type="button" className="nexus-icon-btn" title="Émojis" onClick={() => onInsertEmoji?.("✨")}>
            <Smile className="w-3.5 h-3.5" />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={300}
            rows={1}
            placeholder={`Parler dans ${roomName}…`}
            className="nexus-chat-input nexus-chat-textarea"
            data-testid="nexus-chat-input"
          />
          <button
            type="submit"
            disabled={!text.trim()}
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
