import React, { useEffect, useRef, useState, useCallback } from "react";
import Phaser from "phaser";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Users, Globe2, Wifi, WifiOff, Shield, Crown, Eye, EyeOff,
  Megaphone, Ban, Volume2, VolumeX, Footprints, Snowflake, Sparkles,
  CloudRain, CloudLightning, Sun, Cloud, X, MapPin, Search, History,
  Package, BarChart3, ChevronLeft, ChevronRight, Smile, MessageCircle,
  Hash, UserPlus, Briefcase, Zap, Map, Lock,
} from "lucide-react";
import { toast } from "sonner";
import HeroName from "@/components/HeroName";
import api from "@/lib/api";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { NexusIsoScene, RARITY_HEX } from "@/lib/NexusIsoScene";

const WEATHER_LABEL = {
  clear: { fr: "Ciel clair", icon: Sun, color: "text-yellow-300" },
  rain:  { fr: "Pluie", icon: CloudRain, color: "text-blue-300" },
  storm: { fr: "Orage", icon: CloudLightning, color: "text-purple-300" },
  eclipse: { fr: "Éclipse", icon: Cloud, color: "text-zinc-300" },
  aurora:  { fr: "Aurore", icon: Sparkles, color: "text-cyan-300" },
};

const CHANNEL_CONFIG = {
  global: { fr: "Global", icon: Globe2, color: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/40" },
  room: { fr: "Salle", icon: Hash, color: "text-zinc-200", bg: "bg-white/5 border-white/20" },
  guild: { fr: "Guilde", icon: Shield, color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/40" },
  whisper: { fr: "Chuchoter", icon: UserPlus, color: "text-pink-300", bg: "bg-pink-500/10 border-pink-500/40" },
  trade: { fr: "Commerce", icon: Briefcase, color: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/40" },
  event: { fr: "Événement", icon: Zap, color: "text-purple-300", bg: "bg-purple-500/10 border-purple-500/40" },
};

const QUICK_EMOJIS = ["😀", "😂", "🥲", "😎", "🤔", "😡", "❤️", "💜", "💛", "🔥", "⚔️", "🛡️", "✨", "💎", "👑", "🎉", "👍", "👎", "🙏", "💀"];

export default function NexusOverlay() {
  const ns = useNexusSocket();
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const chatEndRef = useRef(null);

  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [gmOpen, setGmOpen] = useState(false);
  const [gmPickerMode, setGmPickerMode] = useState(false);
  const [pendingGm, setPendingGm] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [banOpen, setBanOpen] = useState(false);
  const [banHours, setBanHours] = useState(24);
  const [banReason, setBanReason] = useState("");
  const [announceText, setAnnounceText] = useState("");
  const [popupTitle, setPopupTitle] = useState("Décret du Conseil");
  const [popupBody, setPopupBody] = useState("");
  const [spawnForm, setSpawnForm] = useState({ name: "Éclat d'Aether", rarity: "rare", icon: "✨" });
  const [gmInvisible, setGmInvisible] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [inspectTab, setInspectTab] = useState("stats");
  const [mapOpen, setMapOpen] = useState(false);
  const [rooms, setRooms] = useState([]);

  const pendingGmRef = useRef(null);
  const spawnFormRef = useRef(spawnForm);

  // Destructure context (default to empty object so hooks below stay stable)
  const {
    overlayOpen = false, setOverlayOpen = () => {}, status = "idle", room = null, you = null,
    players = [], weather = "clear", isStaff = false,
    chat = [], activeChannel = "room", setActiveChannel = () => {},
    whisperTarget = null, setWhisperTarget = () => {},
    unreadByChannel = {}, markChannelRead = () => {},
    sendChat = () => {}, move = () => {}, changeRoom = () => {}, pickupItem = () => {},
    gm: gmApi = {}, onInspectResult = () => () => {},
    attachScene = () => {}, detachScene = () => {},
    popup = null, dismissPopup = () => {}, globalAnnounce = null,
    presence = { total: 0, by_room: {}, active_rooms: 0 },
  } = ns || {};

  // Bind scene callbacks to context
  useEffect(() => {
    if (!ns) return;
    attachScene({
      onRoomJoined: (payload) => { rebuildScene(payload); },
      onPlayerJoin: (p) => sceneRef.current?.upsertPlayer(p),
      onPlayerLeave: (sid) => sceneRef.current?.removePlayer(sid),
      onPlayerMove: ({ sid, tx, ty, facing, teleport }) => sceneRef.current?.movePlayer(sid, tx, ty, facing, !!teleport),
      onPlayerStatus: (sid, patch) => sceneRef.current?.setPlayerStatus(sid, patch),
      onChatBubble: (sid, t) => sceneRef.current?.showBubble(sid, t),
      onWeather: (w) => sceneRef.current?.applyWeather(w),
      onItemSpawned: (item) => sceneRef.current?.spawnItem(item),
      onItemRemoved: (id) => sceneRef.current?.removeItem(id),
    });
    return () => detachScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ns]);

  // GM inspect result subscription
  useEffect(() => {
    if (!ns || !onInspectResult) return;
    const unsub = onInspectResult((data) => {
      setInspectData(data);
      setInspectTab("stats");
    });
    return unsub;
  }, [onInspectResult, ns]);

  const rebuildScene = useCallback((payload) => {
    if (!containerRef.current) return;
    const onPlayerClick = (p) => { setSelectedTarget(p); setGmOpen(true); };
    const onTileClick = (tile) => {
      if (!pendingGmRef.current) return;
      const { kind, target } = pendingGmRef.current;
      if (kind === "teleport" && target) {
        gmApi.teleport && gmApi.teleport(target.user_id, tile.tx, tile.ty);
        toast.success(`Téléportation : ${target.username} → (${tile.tx},${tile.ty})`);
      } else if (kind === "spawn") {
        gmApi.spawnItem && gmApi.spawnItem({ name: spawnFormRef.current.name, rarity: spawnFormRef.current.rarity,
                       icon: spawnFormRef.current.icon, tx: tile.tx, ty: tile.ty });
        toast.success(`Relique invoquée en (${tile.tx},${tile.ty})`);
      }
      setPendingGm(null);
      setGmPickerMode(false);
      if (sceneRef.current) sceneRef.current.gmPickerMode = false;
    };
    const onMoveEmit = (tx, ty, facing) => move(tx, ty, facing);

    const sceneData = {
      you: payload.you, room: payload.room,
      players: payload.players, items: payload.items,
      weather: payload.weather,
      onPlayerClick, onTileClick, onMoveEmit,
    };

    if (gameRef.current) {
      // Persistent Phaser game — just restart the scene with new data
      // This avoids destroying the canvas (smoother MMO teleport feel)
      try {
        gameRef.current.scene.stop("NexusIsoScene");
        gameRef.current.scene.start("NexusIsoScene", sceneData);
      } catch (e) {
        // Fallback: full restart
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    }
    if (!gameRef.current) {
      const config = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        physics: { default: "arcade", arcade: { debug: false } },
        scene: NexusIsoScene,
        backgroundColor: "#030208",
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      };
      gameRef.current = new Phaser.Game(config);
      gameRef.current.scene.start("NexusIsoScene", sceneData);
    }
    const game = gameRef.current;
    const tryReady = (attempt = 0) => {
      const scene = game.scene.getScene("NexusIsoScene");
      if (!scene || !scene.add) {
        if (attempt < 30) setTimeout(() => tryReady(attempt + 1), 60);
        return;
      }
      sceneRef.current = scene;
      scene.onPickup = (id) => pickupItem(id);
      scene.gmPickerMode = false;
    };
    tryReady();
  }, [gmApi, move, pickupItem]);

  useEffect(() => { pendingGmRef.current = pendingGm; }, [pendingGm]);
  useEffect(() => { spawnFormRef.current = spawnForm; }, [spawnForm]);

  // Build scene the first time the overlay opens (and room is ready)
  useEffect(() => {
    if (overlayOpen && room && you && !gameRef.current && containerRef.current) {
      rebuildScene({ room, you, players, items: [], weather });
    }
    if (!overlayOpen && gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayOpen, room, you]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);
  useEffect(() => { if (overlayOpen) markChannelRead(activeChannel); }, [overlayOpen, activeChannel, markChannelRead]);

  // Load rooms once
  useEffect(() => {
    if (!overlayOpen) return;
    api.get("/nexus/rooms").then((r) => setRooms(r.data || [])).catch(() => {});
  }, [overlayOpen]);

  // Filtered chat by channel
  const filteredChat = chat.filter((m) => (m.channel || "room") === activeChannel);

  const submitChat = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    if (activeChannel === "whisper") {
      if (!whisperTarget) {
        toast.error("Sélectionnez un destinataire pour chuchoter.");
        return;
      }
      sendChat(text, "whisper", whisperTarget.user_id);
    } else {
      sendChat(text, activeChannel);
    }
    setText("");
    setEmojiOpen(false);
  };

  const insertEmoji = (e) => { setText((t) => t + e); };

  const requestTilePickFor = (kind, target = null) => {
    setPendingGm({ kind, target });
    setGmPickerMode(true);
    if (sceneRef.current) sceneRef.current.gmPickerMode = true;
    toast.info(kind === "teleport" ? "Cliquez une case pour téléporter" : "Cliquez une case pour invoquer");
    setGmOpen(false);
  };

  const toggleInvisible = () => {
    const v = !gmInvisible;
    setGmInvisible(v);
    gmApi.invisible && gmApi.invisible(v);
  };

  const submitAnnounce = (e) => {
    e?.preventDefault();
    if (!announceText.trim()) return;
    gmApi.announce && gmApi.announce(announceText);
    setAnnounceText("");
  };

  const submitPopup = (e) => {
    e?.preventDefault();
    if (!popupBody.trim()) return;
    gmApi.popup && gmApi.popup(popupTitle, popupBody, "info");
    setPopupBody("");
    toast.success("Notification envoyée à tous les héros.");
  };

  const submitBan = (e) => {
    e?.preventDefault();
    if (!selectedTarget) return;
    gmApi.ban && gmApi.ban(selectedTarget.user_id, parseInt(banHours, 10) || 24, banReason);
    setBanOpen(false);
    setBanReason("");
    setBanHours(24);
    setGmOpen(false);
  };

  const onWhisper = (p) => {
    setWhisperTarget(p);
    setActiveChannel("whisper");
  };

  const WeatherIcon = (WEATHER_LABEL[weather] || WEATHER_LABEL.clear).icon;
  const ChannelIcon = (CHANNEL_CONFIG[activeChannel] || CHANNEL_CONFIG.room).icon;

  return (
    <AnimatePresence>
      {overlayOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] bg-gradient-to-br from-[#0A0613] via-[#05030D] to-[#1A0B3D]"
          data-testid="nexus-overlay">
          {/* ===== TOP BAR ===== */}
          <div className="absolute top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between gap-2 backdrop-blur bg-black/40 border-b border-cyan-500/20">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-cyan-300" />
                <span className="font-display font-black text-xl text-cyan-200">Nexus <span className="text-yellow-300">Online</span></span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] font-bold flex items-center gap-2 flex-wrap text-zinc-400">
                {status === "online" ? <><Wifi className="w-3 h-3 text-green-400" /> <span className="text-green-400">Connecté</span></> :
                 status === "connecting" ? <span className="text-yellow-400">Connexion...</span> :
                 <><WifiOff className="w-3 h-3 text-red-400" /> <span className="text-red-400">{status}</span></>}
                <span data-testid="presence-total" className="text-cyan-300">🌌 <span className="font-mono-stat text-cyan-200 font-bold">{presence.total}</span> héros</span>
                <span className="text-zinc-500" data-testid="presence-room">🏰 Salle : <span className="text-cyan-200 font-bold">{players.length}</span></span>
                <span className="text-zinc-500" data-testid="presence-rooms">🗺️ <span className="text-cyan-200 font-bold">{presence.active_rooms}</span> salles actives</span>
                {room && <span className="text-cyan-300">· {room.name}</span>}
                <span className={`flex items-center gap-1 ${WEATHER_LABEL[weather]?.color}`}>
                  <WeatherIcon className="w-3 h-3" /> {WEATHER_LABEL[weather]?.fr || weather}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button onClick={() => setMapOpen((v) => !v)} data-testid="nexus-map-toggle"
                className={`px-3 py-1 rounded text-xs font-bold font-display border flex items-center gap-1 transition-all ${mapOpen ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10" : "border-white/10 text-zinc-300 hover:border-white/30"}`}>
                <Map className="w-3 h-3" /> Carte du Nexus
              </button>
              {isStaff && (
                <button onClick={() => { setSelectedTarget(null); setGmOpen(true); }} data-testid="gm-open-button"
                  className="ml-2 px-3 py-1 rounded text-xs font-bold font-display border border-yellow-500/60 text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Panneau du Gardien
                </button>
              )}
              <button onClick={() => setOverlayOpen(false)} data-testid="nexus-close"
                className="ml-2 w-9 h-9 rounded-md border border-white/10 hover:border-red-500/40 hover:text-red-300 text-zinc-300 flex items-center justify-center transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ===== GM GLOBAL ANNOUNCEMENT BANNER ===== */}
          <AnimatePresence>
            {globalAnnounce && (
              <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-40 rounded-xl px-4 py-2 border border-yellow-500/60 bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 backdrop-blur shadow-[0_0_30px_rgba(234,179,8,0.4)] max-w-2xl"
                data-testid="gm-announce-banner">
                <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-300 font-bold flex items-center justify-center gap-2">
                  <Megaphone className="w-3 h-3" /> Décret — {globalAnnounce.by_username}
                </div>
                <div className="text-sm text-yellow-100 mt-1 font-display text-center">{globalAnnounce.text}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== MAIN CANVAS ===== */}
          <div className="absolute inset-0 top-14" ref={containerRef} data-testid="nexus-canvas-wrapper" />

          {gmPickerMode && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 glass rounded-lg px-3 py-2 border border-yellow-500/40 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-yellow-300" />
              <span className="text-xs text-yellow-200">Mode ciblage — cliquez une case</span>
              <button onClick={() => { setPendingGm(null); setGmPickerMode(false); if (sceneRef.current) sceneRef.current.gmPickerMode = false; }}
                className="text-xs text-zinc-400 hover:text-white ml-2"><X className="w-3 h-3" /></button>
            </div>
          )}

          {/* ===== NEXUS MAP (PORTALS) ===== */}
          <NexusMap open={mapOpen} onClose={() => setMapOpen(false)}
            rooms={rooms} currentRoom={room?.id} you={you}
            onTravel={(id) => { changeRoom(id); setMapOpen(false); }} />

          {/* ===== CHAT PANEL (bottom-left) ===== */}
          <div className={`absolute bottom-4 left-4 z-30 transition-all ${chatCollapsed ? "w-12" : "w-[380px]"}`} data-testid="nexus-chat">
            {chatCollapsed ? (
              <button onClick={() => setChatCollapsed(false)}
                className="w-12 h-12 rounded-full glass border border-cyan-500/40 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/10">
                <MessageCircle className="w-5 h-5" />
              </button>
            ) : (
              <div className="glass rounded-xl border border-white/10 overflow-hidden flex flex-col" style={{ maxHeight: "55vh" }}>
                {/* Channel tabs */}
                <div className="flex items-center gap-0.5 border-b border-white/10 bg-black/30 px-1 overflow-x-auto">
                  {Object.entries(CHANNEL_CONFIG).map(([id, cfg]) => {
                    const Ico = cfg.icon;
                    const unread = unreadByChannel[id] || 0;
                    const active = activeChannel === id;
                    return (
                      <button key={id} onClick={() => { setActiveChannel(id); markChannelRead(id); }}
                        data-testid={`chat-channel-${id}`}
                        className={`relative px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border-b-2 transition-all whitespace-nowrap ${active ? `${cfg.color} border-current` : "text-zinc-500 border-transparent hover:text-zinc-300"}`}>
                        <Ico className="w-3 h-3" />
                        <span className="hidden sm:inline">{cfg.fr}</span>
                        {unread > 0 && !active && (
                          <span className="ml-0.5 px-1 rounded-full bg-red-500 text-[9px] text-white">{unread > 9 ? "9+" : unread}</span>
                        )}
                      </button>
                    );
                  })}
                  <button onClick={() => setChatCollapsed(true)}
                    className="ml-auto text-zinc-500 hover:text-white px-2 py-1.5">
                    <ChevronLeft className="w-3 h-3 rotate-180" />
                  </button>
                </div>
                {/* Whisper target indicator */}
                {activeChannel === "whisper" && (
                  <div className="px-3 py-1.5 border-b border-pink-500/20 bg-pink-500/5 text-xs flex items-center gap-2">
                    <UserPlus className="w-3 h-3 text-pink-300" />
                    {whisperTarget ? (
                      <>
                        <span className="text-pink-200">À</span>
                        <HeroName user={whisperTarget} size="sm" />
                        <button onClick={() => setWhisperTarget(null)} className="ml-auto text-zinc-500 hover:text-white text-[10px]">
                          Changer
                        </button>
                      </>
                    ) : (
                      <span className="text-zinc-400 italic">Cliquez un héros dans la liste pour chuchoter</span>
                    )}
                  </div>
                )}
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-2 text-xs space-y-1" data-testid="nexus-chat-log">
                  {filteredChat.length === 0 && (
                    <div className="text-zinc-500 italic text-center py-6">
                      Aucun message dans <span className="text-cyan-300">{CHANNEL_CONFIG[activeChannel].fr}</span>
                    </div>
                  )}
                  {filteredChat.map((m, i) => {
                    const ChanIco = CHANNEL_CONFIG[m.channel || "room"]?.icon;
                    const chanColor = CHANNEL_CONFIG[m.channel || "room"]?.color;
                    return (
                      <div key={i} className="leading-tight">
                        <span className="inline-flex items-center gap-1">
                          {ChanIco && <ChanIco className={`w-2.5 h-2.5 ${chanColor}`} />}
                          <span className={`font-display font-bold ${m.role === "admin" ? "text-yellow-300" : m.role === "moderator" ? "text-orange-300" : chanColor || "text-cyan-300"}`}>
                            {m.role === "admin" && "👑 "}{m.role === "moderator" && "🛡️ "}{m.username}
                          </span>
                          {m.channel === "whisper" && m.target_username && (
                            <span className="text-pink-300 text-[10px]">→ {m.target_username}</span>
                          )}
                          <span className="text-zinc-500 text-[10px]">· niv {m.level}</span>
                        </span>
                        <div className="text-zinc-200 break-words">{m.text}</div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                {/* Input */}
                <form onSubmit={submitChat} className="flex gap-1 p-2 border-t border-white/10 bg-black/30 relative">
                  <button type="button" onClick={() => setEmojiOpen((v) => !v)} data-testid="chat-emoji-toggle"
                    className="px-2 py-1.5 rounded border border-white/10 text-zinc-300 hover:border-cyan-500/40">
                    <Smile className="w-3 h-3" />
                  </button>
                  <input value={text} onChange={(e) => setText(e.target.value)} maxLength={280}
                    placeholder={activeChannel === "whisper" && !whisperTarget ? "Choisissez un destinataire..." : `Message en ${CHANNEL_CONFIG[activeChannel].fr}...`}
                    className="flex-1 bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs" data-testid="nexus-chat-input" />
                  <button type="submit" disabled={!text.trim() || (activeChannel === "whisper" && !whisperTarget)}
                    className="px-2 py-1.5 rounded border border-cyan-500/40 text-cyan-300 disabled:opacity-40" data-testid="nexus-chat-send">
                    <Send className="w-3 h-3" />
                  </button>
                  {emojiOpen && (
                    <div className="absolute bottom-12 left-0 grid grid-cols-10 gap-1 p-2 rounded-lg bg-black/90 border border-white/20 shadow-xl">
                      {QUICK_EMOJIS.map((e) => (
                        <button key={e} type="button" onClick={() => insertEmoji(e)}
                          className="w-7 h-7 hover:bg-white/10 rounded text-lg flex items-center justify-center">
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* ===== PLAYERS LIST (bottom-right) ===== */}
          <div className="absolute bottom-4 right-4 z-30 w-64" data-testid="nexus-players">
            <div className="glass rounded-xl border border-white/10 p-2">
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2 flex items-center gap-1 px-1">
                <Users className="w-3 h-3" /> Présents ({players.length})
              </div>
              <div className="space-y-0.5 max-h-44 overflow-y-auto text-xs">
                {players.map((p) => (
                  <div key={p.sid} className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-white/5 group">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block shrink-0" />
                    <button onClick={() => isStaff && (setSelectedTarget(p), setGmOpen(true))}
                      className="flex-1 text-left flex items-center gap-1 min-w-0"
                      data-testid={`player-row-${p.user_id}`}>
                      <HeroName user={p} size="sm" />
                      <span className="text-[10px] text-zinc-500 truncate">· {p.class_name}</span>
                    </button>
                    {p.muted && <VolumeX className="w-3 h-3 text-red-400 shrink-0" />}
                    {p.frozen && <Snowflake className="w-3 h-3 text-cyan-300 shrink-0" />}
                    {p.invisible && <EyeOff className="w-3 h-3 text-purple-300 shrink-0" />}
                    {p.user_id !== you?.user_id && (
                      <button onClick={() => onWhisper(p)} title="Chuchoter"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-pink-400 hover:text-pink-200 shrink-0"
                        data-testid={`whisper-${p.user_id}`}>
                        <UserPlus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== GM PANEL ===== */}
          <GmPanel
            open={gmOpen && isStaff} onClose={() => setGmOpen(false)}
            target={selectedTarget} clearTarget={() => setSelectedTarget(null)}
            weather={weather}
            gm={gmApi}
            requestTilePickFor={requestTilePickFor}
            announceText={announceText} setAnnounceText={setAnnounceText} submitAnnounce={submitAnnounce}
            popupTitle={popupTitle} setPopupTitle={setPopupTitle}
            popupBody={popupBody} setPopupBody={setPopupBody} submitPopup={submitPopup}
            spawnForm={spawnForm} setSpawnForm={setSpawnForm}
            gmInvisible={gmInvisible} toggleInvisible={toggleInvisible}
            onBanClick={() => setBanOpen(true)}
            onInspect={() => { if (selectedTarget) { gmApi.inspect && gmApi.inspect(selectedTarget.user_id); } }}
          />

          {/* ===== BAN MODAL ===== */}
          <BanModal open={banOpen} target={selectedTarget}
            onClose={() => setBanOpen(false)} onSubmit={submitBan}
            hours={banHours} setHours={setBanHours} reason={banReason} setReason={setBanReason} />

          {/* ===== INSPECT RESULT MODAL ===== */}
          <InspectModal data={inspectData} onClose={() => setInspectData(null)} tab={inspectTab} setTab={setInspectTab} />

          {/* ===== POPUP NOTIFICATION (from GM) ===== */}
          <PopupNotificationModal popup={popup} onClose={dismissPopup} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============== Subcomponents ============== */

function GmPanel({ open, onClose, target, clearTarget, weather, gm, requestTilePickFor,
                   announceText, setAnnounceText, submitAnnounce,
                   popupTitle, setPopupTitle, popupBody, setPopupBody, submitPopup,
                   spawnForm, setSpawnForm, gmInvisible, toggleInvisible, onBanClick, onInspect }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose} data-testid="gm-panel">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="bg-gradient-to-br from-[#1A0B3D] via-[#0A0613] to-[#1A0B3D] border border-yellow-500/40 rounded-2xl p-5 max-w-3xl w-full max-h-[88vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-300" />
                <h2 className="font-display font-black text-xl text-yellow-300">Panneau du Gardien</h2>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {target ? (
              <div className="mb-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                <div className="text-[10px] uppercase tracking-widest text-yellow-300 mb-2 font-bold">Cible sélectionnée</div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <HeroName user={target} />
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {target.class_name} · niv {target.level} · ({target.tx},{target.ty})
                    </div>
                  </div>
                  <button onClick={clearTarget} className="text-xs text-zinc-500 hover:text-white">Changer la cible</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  <GmBtn icon={Footprints} label="TP vers" color="cyan"
                    onClick={() => { gm.tpToPlayer(target.user_id); toast.success(`Téléporté vers ${target.username}`); }}
                    testid="gm-tp-to" />
                  <GmBtn icon={MapPin} label="TP ici" color="cyan"
                    onClick={() => { gm.tpPlayerToMe(target.user_id); toast.success(`${target.username} convoqué`); }}
                    testid="gm-tp-here" />
                  <GmBtn icon={Footprints} label="Téléporter…" color="purple"
                    onClick={() => requestTilePickFor("teleport", target)}
                    testid="gm-teleport" />
                  <GmBtn icon={Search} label="Inspecter" color="cyan"
                    onClick={onInspect} testid="gm-inspect" />
                  <GmBtn icon={Eye} label="Observer" color="purple"
                    onClick={() => { gm.observe(target.user_id); }} testid="gm-observe" />
                  <GmBtn icon={target.muted ? Volume2 : VolumeX}
                    label={target.muted ? "Voix" : "Muet"} color="purple"
                    onClick={() => gm.mute(target.user_id, !target.muted)} testid="gm-mute" />
                  <GmBtn icon={Snowflake}
                    label={target.frozen ? "Libérer" : "Figer"} color="cyan"
                    onClick={() => gm.freeze(target.user_id, !target.frozen)} testid="gm-freeze" />
                  <GmBtn icon={Lock} label="Prison 30min" color="orange"
                    onClick={() => { gm.prison(target.user_id, 30); }} testid="gm-prison" />
                  <GmBtn icon={Footprints} label="Expulser" color="orange"
                    onClick={() => { gm.kick(target.user_id, "Décret du Conseil"); toast.success("Expulsion envoyée"); }}
                    testid="gm-kick" />
                  <GmBtn icon={Ban} label="Bannir…" color="red" onClick={onBanClick} testid="gm-ban" />
                </div>
                {/* Economy actions */}
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold">Donner / Retirer Aether</label>
                    <div className="flex gap-1 mt-1">
                      <input type="number" placeholder="±montant" data-testid="gm-aether-amount"
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs font-mono"
                        id={`aether-${target.user_id}`} />
                      <button onClick={() => {
                        const el = document.getElementById(`aether-${target.user_id}`);
                        const v = parseInt(el.value, 10);
                        if (!v) { toast.error("Montant invalide"); return; }
                        gm.giveAether(target.user_id, v);
                        el.value = "";
                      }} data-testid="gm-give-aether"
                        className="px-2 py-1 rounded border border-yellow-500/40 text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 text-xs font-bold">
                        ⟡
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold">Donner relique</label>
                    <div className="flex gap-1 mt-1">
                      <input placeholder="Nom" data-testid="gm-item-name"
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                        id={`itemname-${target.user_id}`} />
                      <button onClick={() => {
                        const el = document.getElementById(`itemname-${target.user_id}`);
                        const v = (el.value || "").trim();
                        if (!v) { toast.error("Nom requis"); return; }
                        gm.giveItem(target.user_id, { name: v, rarity: "rare", icon: "✨" });
                        el.value = "";
                      }} data-testid="gm-give-item"
                        className="px-2 py-1 rounded border border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold">
                        ✨
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-400 italic">
                Cliquez sur un héros (canvas ou liste) pour le cibler.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Annonce */}
              <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2 font-bold flex items-center gap-1">
                  <Megaphone className="w-3 h-3" /> Annonce (bannière)
                </div>
                <form onSubmit={submitAnnounce} className="space-y-2">
                  <textarea value={announceText} onChange={(e) => setAnnounceText(e.target.value)}
                    maxLength={240} rows={2} placeholder="Diffusée à toutes les salles..."
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs"
                    data-testid="gm-announce-input" />
                  <button type="submit" disabled={!announceText.trim()}
                    className="w-full px-3 py-1.5 rounded border border-yellow-500/40 text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 text-xs font-bold disabled:opacity-40"
                    data-testid="gm-announce-submit">Proclamer</button>
                </form>
              </div>

              {/* Popup notif */}
              <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2 font-bold flex items-center gap-1">
                  <Megaphone className="w-3 h-3" /> Notification popup
                </div>
                <form onSubmit={submitPopup} className="space-y-2">
                  <input value={popupTitle} onChange={(e) => setPopupTitle(e.target.value)}
                    maxLength={80} placeholder="Titre"
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                    data-testid="gm-popup-title" />
                  <textarea value={popupBody} onChange={(e) => setPopupBody(e.target.value)}
                    maxLength={400} rows={2} placeholder="Message (s'affiche dans une popup chez tous les héros)"
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs"
                    data-testid="gm-popup-body" />
                  <button type="submit" disabled={!popupBody.trim()}
                    className="w-full px-3 py-1.5 rounded border border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold disabled:opacity-40"
                    data-testid="gm-popup-submit">Envoyer en popup</button>
                </form>
              </div>

              {/* Météo */}
              <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2 font-bold flex items-center gap-1">
                  <Cloud className="w-3 h-3" /> Météo de la salle
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {["clear", "rain", "storm", "eclipse", "aurora"].map((w) => {
                    const Ico = WEATHER_LABEL[w].icon;
                    return (
                      <button key={w} onClick={() => { gm.weather(w); toast.success(`Météo : ${WEATHER_LABEL[w].fr}`); }}
                        data-testid={`gm-weather-${w}`}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded border text-[10px] ${weather === w ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>
                        <Ico className="w-3 h-3" /> {WEATHER_LABEL[w].fr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Invoquer */}
              <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Invoquer relique
                </div>
                <input value={spawnForm.name} onChange={(e) => setSpawnForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Nom" maxLength={60}
                  className="w-full mb-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                  data-testid="gm-spawn-name" />
                <div className="grid grid-cols-2 gap-1 mb-2">
                  <select value={spawnForm.rarity} onChange={(e) => setSpawnForm((s) => ({ ...s, rarity: e.target.value }))}
                    className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                    data-testid="gm-spawn-rarity">
                    {Object.keys(RARITY_HEX).map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input value={spawnForm.icon} onChange={(e) => setSpawnForm((s) => ({ ...s, icon: e.target.value }))}
                    placeholder="✨" maxLength={2}
                    className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-center"
                    data-testid="gm-spawn-icon" />
                </div>
                <button onClick={() => requestTilePickFor("spawn")} data-testid="gm-spawn-place"
                  className="w-full px-3 py-1.5 rounded border border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold">
                  Placer sur une case
                </button>
              </div>

              {/* Invisibilité */}
              <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2 font-bold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Mode invisible
                </div>
                <div className="text-[11px] text-zinc-400 mb-2">
                  Vous disparaissez pour les héros standards. Les autres Gardiens vous voient toujours.
                </div>
                <button onClick={toggleInvisible} data-testid="gm-invisible-toggle"
                  className={`w-full px-3 py-1.5 rounded border text-xs font-bold ${gmInvisible ? "border-purple-500/60 bg-purple-500/20 text-purple-200" : "border-white/20 text-zinc-300 hover:border-white/40"}`}>
                  {gmInvisible ? <><EyeOff className="w-3 h-3 inline mr-1" /> Désactiver invisibilité</> : <><Eye className="w-3 h-3 inline mr-1" /> Devenir invisible</>}
                </button>
              </div>

              {/* World Boss */}
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <div className="text-[10px] uppercase tracking-widest text-red-300 mb-2 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Boss Mondial
                </div>
                <input id="gm-boss-name" placeholder="Nom du boss" defaultValue="Archonte du Néant"
                  className="w-full mb-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                  data-testid="gm-boss-name" />
                <input id="gm-boss-hp" type="number" placeholder="PV" defaultValue="10000"
                  className="w-full mb-2 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs font-mono"
                  data-testid="gm-boss-hp" />
                <button onClick={() => {
                  const name = document.getElementById("gm-boss-name").value.trim() || "Archonte";
                  const hp = parseInt(document.getElementById("gm-boss-hp").value, 10) || 10000;
                  gm.worldBoss(name, hp);
                  toast.success("Boss invoqué dans la salle");
                }} data-testid="gm-boss-spawn"
                  className="w-full px-3 py-1.5 rounded border border-red-500/40 text-red-300 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold">
                  Invoquer le Boss
                </button>
              </div>

              {/* Rift */}
              <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
                <div className="text-[10px] uppercase tracking-widest text-purple-300 mb-2 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Faille dimensionnelle
                </div>
                <div className="text-[11px] text-zinc-400 mb-2">
                  Ouvre une faille visuelle dans la salle actuelle — annonce un événement.
                </div>
                <button onClick={() => { gm.rift(); toast.success("Faille ouverte"); }}
                  data-testid="gm-rift-open"
                  className="w-full px-3 py-1.5 rounded border border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold">
                  Ouvrir une faille
                </button>
              </div>
            </div>

            <div className="mt-4 text-center text-[10px] text-zinc-500 uppercase tracking-widest">
              <Shield className="w-3 h-3 inline mr-1" /> Toutes les actions sont consignées dans le Codex
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GmBtn({ icon: Icon, label, color = "cyan", onClick, testid }) {
  const map = {
    cyan: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20",
    purple: "border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20",
    orange: "border-orange-500/40 text-orange-300 bg-orange-500/10 hover:bg-orange-500/20",
    red: "border-red-500/40 text-red-300 bg-red-500/10 hover:bg-red-500/20",
  };
  return (
    <button onClick={onClick} data-testid={testid}
      className={`flex items-center justify-center gap-1 px-3 py-2 rounded border text-xs font-bold ${map[color]}`}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}

function BanModal({ open, target, onClose, onSubmit, hours, setHours, reason, setReason }) {
  if (!open || !target) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose} data-testid="gm-ban-modal">
      <motion.form initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        onSubmit={onSubmit} onClick={(e) => e.stopPropagation()}
        className="bg-[#0A0613] border border-red-500/40 rounded-2xl p-5 max-w-md w-full">
        <div className="flex items-center gap-2 mb-3">
          <Ban className="w-5 h-5 text-red-400" />
          <h3 className="font-display font-bold text-lg text-red-300">Bannir {target.username}</h3>
        </div>
        <label className="block text-xs text-zinc-400 mb-1">Durée</label>
        <select value={hours} onChange={(e) => setHours(e.target.value)}
          className="w-full mb-3 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm"
          data-testid="gm-ban-duration">
          <option value="1">1 heure</option>
          <option value="24">1 jour</option>
          <option value="168">1 semaine</option>
          <option value="720">1 mois</option>
          <option value="8760">1 an</option>
        </select>
        <label className="block text-xs text-zinc-400 mb-1">Raison</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)}
          rows={3} maxLength={200} placeholder="Raison du bannissement..."
          className="w-full mb-3 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm"
          data-testid="gm-ban-reason" />
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-3 py-2 rounded border border-white/10 text-zinc-300 text-sm">Annuler</button>
          <button type="submit" data-testid="gm-ban-submit"
            className="flex-1 px-3 py-2 rounded border border-red-500/60 bg-red-500/20 text-red-200 text-sm font-bold">
            Confirmer
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function InspectModal({ data, onClose, tab, setTab }) {
  if (!data) return null;
  const u = data.user || {};
  const TABS = [
    { id: "stats", icon: BarChart3, label: "Stats" },
    { id: "inventory", icon: Package, label: "Inventaire" },
    { id: "history", icon: History, label: "Chronique" },
    { id: "sanctions", icon: Ban, label: "Sanctions" },
    { id: "purchases", icon: Briefcase, label: "Achats" },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose} data-testid="gm-inspect-modal">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0A0613] border border-cyan-500/40 rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-300" />
            <h3 className="font-display font-bold text-lg text-cyan-200">Inspection : {u.username || "?"}</h3>
            <span className="text-xs text-zinc-400">· {u.class_name} · niv {u.level} · {u.rank}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex border-b border-white/10 bg-black/30">
          {TABS.map((t) => {
            const Ico = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1 px-4 py-2 text-xs font-bold border-b-2 ${tab === t.id ? "border-cyan-500 text-cyan-300" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                <Ico className="w-3 h-3" /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-xs">
          {tab === "stats" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Niveau" v={u.level} />
              <Stat label="XP" v={u.xp} />
              <Stat label="Aether" v={u.aether} />
              <Stat label="Réputation" v={u.reputation} />
              <Stat label="Rang" v={u.rank} />
              <Stat label="Rôle" v={u.role} />
              <Stat label="Classe" v={u.class_name} />
              <Stat label="Classe sec." v={u.secondary_class_id} />
              <Stat label="Titre actif" v={u.active_title} />
              <Stat label="Followers" v={u.followers || 0} />
              <Stat label="Following" v={u.following || 0} />
              <Stat label="Inscrit le" v={u.created_at ? new Date(u.created_at).toLocaleDateString() : "?"} />
            </div>
          )}
          {tab === "inventory" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.inventory?.length === 0 && <div className="text-zinc-500 italic">Inventaire vide.</div>}
              {data.inventory?.map((it, i) => (
                <div key={i} className="p-2 rounded border border-white/10 bg-white/5">
                  <div className="text-xl">{it.icon || "✨"}</div>
                  <div className="font-bold text-cyan-200 text-xs truncate">{it.name}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{it.rarity}</div>
                </div>
              ))}
            </div>
          )}
          {tab === "history" && (
            <div className="space-y-1">
              {data.history?.length === 0 && <div className="text-zinc-500 italic">Chronique vide.</div>}
              {data.history?.map((h, i) => (
                <div key={i} className="p-2 border-l-2 border-cyan-500/40 bg-cyan-500/5 rounded-r">
                  <div className="text-zinc-200">{h.text}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{h.created_at ? new Date(h.created_at).toLocaleString() : ""}</div>
                </div>
              ))}
            </div>
          )}
          {tab === "sanctions" && (
            <div className="space-y-1">
              {data.sanctions?.length === 0 && <div className="text-zinc-500 italic">Aucune sanction.</div>}
              {data.sanctions?.map((s, i) => (
                <div key={i} className="p-2 border border-red-500/30 bg-red-500/5 rounded">
                  <div className="text-red-200 font-bold">Banni par {s.banned_by_username || "?"}</div>
                  <div className="text-zinc-300">{s.reason}</div>
                  <div className="text-[10px] text-zinc-500">{s.duration_hours}h · jusqu'au {s.until}</div>
                </div>
              ))}
            </div>
          )}
          {tab === "purchases" && (
            <div className="space-y-1">
              {data.purchases?.length === 0 && <div className="text-zinc-500 italic">Aucun achat.</div>}
              {data.purchases?.map((p, i) => (
                <div key={i} className="p-2 border border-amber-500/30 bg-amber-500/5 rounded flex justify-between">
                  <div>
                    <div className="text-amber-200 font-bold">{p.name || p.sku}</div>
                    <div className="text-[10px] text-zinc-500">{p.purchased_at ? new Date(p.purchased_at).toLocaleString() : ""}</div>
                  </div>
                  <div className="text-amber-300 font-mono">{p.price} ⟡</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
function Stat({ label, v }) {
  return (
    <div className="p-2 rounded border border-white/10 bg-white/5">
      <div className="text-[10px] uppercase text-zinc-500 tracking-widest">{label}</div>
      <div className="font-mono text-cyan-200 text-sm truncate">{v ?? "—"}</div>
    </div>
  );
}

const GROUP_LABELS = {
  center: { fr: "Cœur", color: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/40" },
  social: { fr: "Social", color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/40" },
  combat: { fr: "Combat", color: "text-red-300", bg: "bg-red-500/10 border-red-500/40" },
  knowledge: { fr: "Savoir", color: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/40" },
  mystic: { fr: "Mystique", color: "text-purple-300", bg: "bg-purple-500/10 border-purple-500/40" },
  adventure: { fr: "Aventure", color: "text-orange-300", bg: "bg-orange-500/10 border-orange-500/40" },
  restricted: { fr: "Restreint", color: "text-yellow-200", bg: "bg-yellow-500/10 border-yellow-500/40" },
};

function NexusMap({ open, onClose, rooms, currentRoom, you, onTravel }) {
  if (!open) return null;
  const byGroup = {};
  (rooms || []).forEach((r) => {
    const g = r.group || "misc";
    (byGroup[g] = byGroup[g] || []).push(r);
  });
  const groupOrder = ["center", "social", "combat", "knowledge", "mystic", "adventure", "restricted"];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose} data-testid="nexus-map">
      <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-[#0A0613] via-[#070414] to-[#1A0B3D] border border-cyan-500/40 rounded-2xl max-w-5xl w-full max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-cyan-300" />
            <div>
              <h2 className="font-display font-black text-xl text-cyan-200">Carte du Nexus</h2>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">{rooms.length} sanctuaires connectés</div>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white" data-testid="nexus-map-close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {groupOrder.filter((g) => byGroup[g]?.length).map((g) => {
            const lbl = GROUP_LABELS[g] || { fr: g, color: "text-zinc-300" };
            return (
              <div key={g} className="mb-6">
                <div className={`text-[10px] uppercase tracking-[0.3em] font-bold mb-3 ${lbl.color}`}>{lbl.fr}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {byGroup[g].map((r) => {
                    const isCurrent = currentRoom === r.id;
                    const locked = r.restricted_for_user;
                    return (
                      <button key={r.id} onClick={() => !locked && onTravel(r.id)} disabled={locked || isCurrent}
                        data-testid={`map-room-${r.id}`}
                        className={`relative text-left p-3 rounded-xl border transition-all overflow-hidden group ${isCurrent ? "border-cyan-500/60 bg-cyan-500/10" : locked ? "border-zinc-700/40 bg-zinc-900/30 opacity-60 cursor-not-allowed" : `${lbl.bg || "border-white/10 bg-white/5"} hover:border-white/40 hover:scale-105`}`}>
                        <div className="flex items-start gap-2 mb-1">
                          <div className="text-2xl">{r.icon || "🌀"}</div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-display font-bold text-sm truncate ${isCurrent ? "text-cyan-200" : "text-white"}`}>
                              {r.name}
                            </div>
                            <div className="text-[10px] text-zinc-500">{r.online || 0}/{r.max_players} héros</div>
                          </div>
                          {locked && <Lock className="w-4 h-4 text-yellow-300 shrink-0" />}
                          {isCurrent && (
                            <span className="text-[9px] uppercase tracking-widest font-bold text-cyan-200">Ici</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{r.description}</p>
                        <div className="mt-2 text-[10px] text-zinc-500">
                          Météo : <span className="text-cyan-300">{r.weather}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

function PopupNotificationModal({ popup, onClose }) {
  return (
    <AnimatePresence>
      {popup && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={onClose} data-testid="gm-popup-notif">
          <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-[#1A0B3D] via-[#0A0613] to-[#1A0B3D] border-2 border-yellow-500/60 rounded-2xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(234,179,8,0.5)]">
            <div className="flex items-center gap-2 text-yellow-300 mb-3">
              <Megaphone className="w-5 h-5" />
              <div className="font-display font-black text-xl">{popup.title}</div>
            </div>
            <div className="text-zinc-200 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{popup.body}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4">
              Décret de {popup.by_username}
            </div>
            <button onClick={onClose} data-testid="gm-popup-dismiss"
              className="w-full px-4 py-2 rounded border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 font-bold text-sm">
              Compris
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
