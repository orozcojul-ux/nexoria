import React from "react";
import { MessageCircle, Send, Smile, UserPlus, ChevronDown } from "lucide-react";
import HeroName from "@/components/HeroName";
import { CHANNEL_CONFIG, QUICK_EMOJIS } from "./nexus-constants";

export default function NexusChatDock({
  collapsed,
  onToggleCollapse,
  activeChannel,
  onChannelChange,
  unreadByChannel,
  markChannelRead,
  whisperTarget,
  onClearWhisper,
  messages,
  text,
  onTextChange,
  onSubmit,
  emojiOpen,
  onToggleEmoji,
  onInsertEmoji,
  chatEndRef,
}) {
  if (collapsed) {
    return (
      <div className="nexus-chat-dock" data-testid="nexus-chat">
        <button type="button" className="nexus-chat-fab" onClick={onToggleCollapse} aria-label="Ouvrir le chat">
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="nexus-chat-dock nexus-chat-dock--open" data-testid="nexus-chat">
      <div className="nexus-hud-panel flex flex-col" style={{ maxHeight: "55vh" }}>
        <div className="nexus-hud-panel-head">
          <MessageCircle className="w-3.5 h-3.5 text-cyan-300" />
          <span className="nexus-hud-panel-title">Voix du Nexus</span>
          <button type="button" onClick={onToggleCollapse} className="nexus-icon-btn ml-auto" style={{ width: "1.5rem", height: "1.5rem" }}>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="nexus-channel-tabs">
          {Object.entries(CHANNEL_CONFIG).map(([id, cfg]) => {
            const Icon = cfg.icon;
            const unread = unreadByChannel[id] || 0;
            const active = activeChannel === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { onChannelChange(id); markChannelRead(id); }}
                data-testid={`chat-channel-${id}`}
                className={`nexus-channel-tab ${active ? "nexus-channel-tab--active" : ""}`}
              >
                <Icon className="w-3 h-3" />
                {cfg.fr}
                {unread > 0 && !active && <span className="nexus-channel-badge">{unread > 9 ? "9+" : unread}</span>}
              </button>
            );
          })}
        </div>

        {activeChannel === "whisper" && (
          <div className="px-3 py-1.5 border-b border-pink-500/20 bg-pink-500/5 text-xs flex items-center gap-2">
            <UserPlus className="w-3 h-3 text-pink-300" />
            {whisperTarget ? (
              <>
                <span className="text-pink-200">À</span>
                <HeroName user={whisperTarget} size="sm" />
                <button type="button" onClick={onClearWhisper} className="ml-auto text-zinc-500 hover:text-white text-[10px]">Changer</button>
              </>
            ) : (
              <span className="text-zinc-400 italic">Sélectionnez un héros dans la liste</span>
            )}
          </div>
        )}

        <div className="nexus-chat-log" data-testid="nexus-chat-log">
          {messages.length === 0 ? (
            <p className="text-zinc-500 italic text-center py-6 text-xs">
              Aucun écho dans <span className="text-cyan-300">{CHANNEL_CONFIG[activeChannel].fr}</span>
            </p>
          ) : (
            messages.map((m, i) => {
              const ChanIco = CHANNEL_CONFIG[m.channel || "room"]?.icon;
              return (
                <div key={i} className="nexus-chat-msg">
                  <span className="inline-flex items-center gap-1 flex-wrap">
                    {ChanIco && <ChanIco className="w-2.5 h-2.5 text-cyan-300" />}
                    <HeroName user={{ username: m.username, role: m.role, level: m.level, rank: m.rank }} size="xs" showIcon={false} />
                    <span className="text-zinc-500 text-[10px]">niv.{m.level}</span>
                  </span>
                  <div className="text-zinc-200 break-words mt-0.5">{m.text}</div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={onSubmit} className="nexus-chat-input-row relative">
          <button type="button" onClick={onToggleEmoji} data-testid="chat-emoji-toggle" className="nexus-icon-btn" style={{ width: "1.75rem", height: "1.75rem" }}>
            <Smile className="w-3 h-3" />
          </button>
          <input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            maxLength={280}
            placeholder={activeChannel === "whisper" && !whisperTarget ? "Choisissez un destinataire…" : `Message — ${CHANNEL_CONFIG[activeChannel].fr}`}
            className="nexus-chat-input"
            data-testid="nexus-chat-input"
          />
          <button type="submit" disabled={!text.trim() || (activeChannel === "whisper" && !whisperTarget)} data-testid="nexus-chat-send" className="nexus-icon-btn nexus-icon-btn--active" style={{ width: "1.75rem", height: "1.75rem" }}>
            <Send className="w-3 h-3" />
          </button>
          {emojiOpen && (
            <div className="absolute bottom-11 left-0 grid grid-cols-10 gap-1 p-2 rounded-lg bg-black/95 border border-white/15 shadow-xl z-10">
              {QUICK_EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => onInsertEmoji(e)} className="w-7 h-7 hover:bg-white/10 rounded text-lg">{e}</button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
