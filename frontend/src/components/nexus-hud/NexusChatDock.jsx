import React, { useRef } from "react";
import { Send, X, Smile, Trash2, ScrollText, Palette, Crown, HelpCircle, VolumeX, ShieldCheck, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import HeroName from "@/components/HeroName";
import { isStaffRole, isNexusStaff } from "@/lib/staff-roles";
import {
  nexusChatColors,
  NEXUS_CHAT_EMOJIS,
  NEXUS_VIP_COLOR_PRESETS,
  NEXUS_CHAT_COMMANDS_HINT,
} from "@/lib/nexusChatColors";

export default function NexusChatDock({
  logOpen,
  onToggleLog,
  onOpenHelp,
  roomName = "Salle",
  messages = [],
  text,
  onTextChange,
  onTypingActivity,
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
  viewerIsNexusSupreme = false,
}) {
  const inputRef = useRef(null);

  const isStaff = isStaffRole(viewerRole) || viewerIsNexusSupreme;
  const writeBlocked = chatMuted && !isStaff;

  const handleKeyDown = (e) => {
    if (writeBlocked) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
    if (e.key === "Escape") {
      if (logOpen) onToggleLog?.();
      inputRef.current?.blur();
    }
  };

  const pickColor = async (hex) => {
    try {
      await onSetChatColor?.(hex);
    } catch {
      toast.error("Impossible de changer la couleur.");
    }
  };

  const insertEmoji = (emoji) => {
    if (writeBlocked) return;
    onInsertEmoji?.(emoji);
    onTypingActivity?.(`${text}${emoji}`);
    inputRef.current?.focus();
  };

  const mutedUntilLabel = chatMutedUntil
    ? new Date(chatMutedUntil).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="nexus-chat-dock nexus-chat-dock--ready" data-testid="nexus-chat">
      {logOpen && (
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
              <button type="button" onClick={onToggleLog} className="nexus-icon-btn" aria-label="Masquer l'historique">
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
                const msgIsStaff = isNexusStaff({ role: m.role, is_nexus_supreme: m.is_nexus_supreme });
                const customColor = msgIsStaff ? null : (m.chat_color || m.nexus_chat_color);
                const colors = nexusChatColors(m.role, {
                  is_vip: m.is_vip,
                  is_nexus_supreme: m.is_nexus_supreme,
                  rank: m.rank,
                  active_title: m.active_title,
                  ...(customColor ? { chat_color: customColor, nexus_chat_color: customColor } : {}),
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
        </div>
      )}

      <div className="nexus-chat-composer">
        {writeBlocked && (
          <div className="nexus-chat-muted-notice nexus-chat-muted-notice--compact" data-testid="nexus-chat-muted-notice">
            <VolumeX className="w-3.5 h-3.5 shrink-0" />
            <span>
              Salle muette — lecture seule
              {mutedUntilLabel ? ` (fin ~${mutedUntilLabel})` : ""}
            </span>
          </div>
        )}

        {!writeBlocked && (
          <div className="nexus-chat-toolbar">
            <div className="nexus-chat-emoji-strip" data-testid="nexus-chat-emojis">
              {NEXUS_CHAT_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="nexus-chat-emoji-btn"
                  title={`Insérer ${e}`}
                  onClick={() => insertEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>

            {isVip && !isStaff && (
              <div className="nexus-chat-vip-colors nexus-chat-vip-colors--inline" data-testid="nexus-chat-colors">
                <span className="nexus-chat-vip-label">
                  <Crown className="w-3 h-3 text-amber-300" />
                  <Palette className="w-3 h-3" />
                  Couleur
                  {chatColor && (
                    <span className="nexus-chat-vip-current" style={{ background: chatColor }} />
                  )}
                </span>
                <div className="nexus-chat-vip-swatches nexus-chat-vip-swatches--inline">
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
              </div>
            )}

            {isStaff && (
              <div className="nexus-chat-staff-color-notice nexus-chat-staff-color-notice--compact" data-testid="nexus-chat-staff-color-notice">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span>Couleur fixée au grade Gardien</span>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={writeBlocked ? (e) => e.preventDefault() : onSubmit}
          className={`nexus-chat-input-row${writeBlocked ? " nexus-chat-input-row--disabled" : ""}`}
        >
          <button
            type="button"
            className={`nexus-chat-log-toggle${logOpen ? " nexus-chat-log-toggle--active" : ""}`}
            onClick={onToggleLog}
            title={logOpen ? "Masquer l'historique" : "Afficher l'historique du tchat"}
            data-testid="nexus-chat-log-toggle"
          >
            <ScrollText className="w-3.5 h-3.5" />
            {logOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            {messages.length > 0 && !logOpen && (
              <span className="nexus-chat-log-badge">{messages.length > 99 ? "99+" : messages.length}</span>
            )}
          </button>
          <button
            type="button"
            className="nexus-icon-btn"
            title="Aide commandes (/help)"
            onClick={onOpenHelp}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="nexus-icon-btn"
            title="Émoji ✨"
            disabled={writeBlocked}
            onClick={() => insertEmoji("✨")}
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              if (writeBlocked) return;
              const next = e.target.value;
              onTextChange(next);
              onTypingActivity?.(next);
            }}
            onBlur={() => onTypingActivity?.("")}
            onKeyDown={handleKeyDown}
            maxLength={300}
            rows={1}
            disabled={writeBlocked}
            readOnly={writeBlocked}
            placeholder={writeBlocked ? "Salle muette — lecture seule" : `Parler dans ${roomName}… (/help)`}
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
