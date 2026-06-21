import React, { useEffect, useRef, useState, useCallback } from "react";
import Phaser from "phaser";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Ban, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { isNexusStaff } from "@/lib/staff-roles";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { useHeroCard } from "@/contexts/HeroCardContext";
import { NexusIsoScene } from "@/lib/NexusIsoScene";
import { createPhaserGame } from "@/lib/phaserRenderer";
import { GmPanel, GmContextMenu, GmPlayerInspector } from "@/components/nexus-gm";
import {
  NexusTopBar,
  NexusRoomPulse,
  NexusSocialDock,
  NexusChatDock,
  NexusMapModal,
  NexusEventRibbon,
  NexusRealmPulse,
  NexusBootLoading,
  NexusBootError,
  NexusBootRenderError,
  NexusBootWaiting,
  NexusBootClosed,
  NexusFriendsPanel,
  NexusCombatHud,
} from "@/components/nexus-hud";
import NexusChatHelpPanel from "@/components/nexus-hud/NexusChatHelpPanel";
import "@/components/nexus-hud/NexusHud.css";

export default function NexusOverlay() {
  const ns = useNexusSocket();
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const chatEndRef = useRef(null);

  const [text, setText] = useState("");
  const [chatLogOpen, setChatLogOpen] = useState(false);
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
  const [spawnForm, setSpawnForm] = useState({ name: "Éclat d'Écus", rarity: "rare", icon: "✨" });
  const [gmInvisible, setGmInvisible] = useState(false);
  const [gmGodmode, setGmGodmode] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [inspectTab, setInspectTab] = useState("stats");
  const [mapOpen, setMapOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [adminMenu, setAdminMenu] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsBadge, setFriendsBadge] = useState(0);
  const [friendsTab, setFriendsTab] = useState("chat");
  const [friendsChatId, setFriendsChatId] = useState(null);
  const [friendIds, setFriendIds] = useState([]);

  const pendingGmRef = useRef(null);
  const spawnFormRef = useRef(spawnForm);
  const isStaffRef = useRef(false);

  const {
    overlayOpen = false, setOverlayOpen = () => {}, reconnectNexus, closeNexus,
    nexusGate = { open: true, html: {} },
    status = "idle", room = null, you = null,
    players = [], items = [], weather = "clear", isStaff = false,
    chat = [], roomChatMessages = [], sendRoomChat = () => {}, emitRoomTyping = () => {},
    move = () => {}, changeRoom = () => {}, pickupItem = () => {}, bossAttack = () => {},
    gm: gmApi = {}, onInspectResult = () => () => {},
    attachScene = () => {}, detachScene = () => {},
    popup = null, dismissPopup = () => {}, globalAnnounce = null,
    presence = { total: 0, by_room: {}, active_rooms: 0 },
    gmLogs = [],
    chatHelpOpen = false, openChatHelp = () => {}, closeChatHelp = () => {}, patchYou = () => {},
    combat = null, combatTarget = () => {}, combatAttack = () => {}, combatRespawn = () => {},
    attackCooldown = false, combatDead = false, combatRespawnIn = 0, lastCombatReward = null,
  } = ns || {};

  const { openHeroCard } = useHeroCard();

  const openPlayerHeroCard = useCallback((uid) => {
    if (!uid) return;
    openHeroCard(uid);
  }, [openHeroCard]);

  useEffect(() => {
    if (!overlayOpen) return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.classList.add("nexus-online-open");
    body.classList.add("nexus-online-open");
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.classList.remove("nexus-online-open");
      body.classList.remove("nexus-online-open");
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!isStaff || !gmApi?.godmode) return;
    const onGod = (e) => {
      const on = !!e.detail?.enabled;
      setGmGodmode(on);
      if (overlayOpen) gmApi.godmode?.(on);
    };
    window.addEventListener("nexoria:godmode", onGod);
    return () => window.removeEventListener("nexoria:godmode", onGod);
  }, [isStaff, gmApi, overlayOpen]);

  useEffect(() => {
    if (!isStaff || !gmApi?.godmode || !overlayOpen) return;
    if (localStorage.getItem("nexoria_godmode") === "1") {
      gmApi.godmode(true);
      setGmGodmode(true);
    }
  }, [isStaff, gmApi, overlayOpen]);

  useEffect(() => {
    if (!ns) return;
    attachScene({
      onRoomJoined: (payload) => { rebuildScene(payload); },
      onPlayerJoin: (p) => sceneRef.current?.upsertPlayer(p),
      onPlayerLeave: (sid) => sceneRef.current?.removePlayer(sid),
      onPlayerMove: (m) => sceneRef.current?.movePlayer(m.sid, m.tx, m.ty, m.facing, !!m.teleport, m),
      onPlayerStatus: (sid, patch) => sceneRef.current?.setPlayerStatus(sid, patch),
      onChatBubble: (sid, t, role) => sceneRef.current?.showBubble(sid, t, role),
      onPlayerTyping: (sid, typing) => sceneRef.current?.setPlayerTyping?.(sid, typing),
      onWeather: (w) => sceneRef.current?.applyWeather(w),
      onItemSpawned: (item) => sceneRef.current?.spawnItem(item),
      onItemRemoved: (id) => sceneRef.current?.removeItem(id),
      onWorldBossUpdate: (data) => sceneRef.current?.setWorldBoss?.(data.boss),
      onRiftUpdate: (data) => sceneRef.current?.setActiveRift?.(data.rift),
      onPlayerProfile: (patch) => {
        const scene = sceneRef.current;
        if (!scene) return;
        const sid = patch?.sid || scene.findPlayerSidByUserId?.(patch?.user_id);
        if (sid) scene.setPlayerProfile?.(sid, patch);
      },
      syncCombatEnemies: (enemies) => sceneRef.current?.syncCombatEnemies?.(enemies),
      clearCombatEnemies: () => sceneRef.current?.clearCombatEnemies?.(),
      upsertCombatEnemy: (e) => sceneRef.current?.upsertCombatEnemy?.(e),
      removeCombatEnemy: (id) => sceneRef.current?.removeCombatEnemy?.(id),
      showCombatDamage: (tx, ty, dmg, crit) => sceneRef.current?.showCombatDamage?.(tx, ty, dmg, crit),
      flashPlayerDamage: () => sceneRef.current?.flashPlayerDamage?.(),
      setCombatTarget: (id) => sceneRef.current?.setCombatTarget?.(id),
    });
    return () => detachScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ns]);

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
    const forceCanvas = !!payload.forceCanvas;
    const onPlayerClick = (p, meta = {}) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const x = rect ? Math.min(rect.width - 240, Math.max(8, (meta.screenX || 0))) : 100;
      const y = rect ? Math.min(rect.height - 380, Math.max(8, (meta.screenY || 0))) : 100;

      if (isStaffRef.current && meta.right) {
        setSelectedTarget(p);
        setGmOpen(true);
        return;
      }
      if (isStaffRef.current) {
        setAdminMenu({ target: p, x, y });
        return;
      }
      openPlayerHeroCard(p.user_id);
    };
    const onTileClick = (tile) => {
      if (!pendingGmRef.current) return;
      const { kind, target } = pendingGmRef.current;
      if (kind === "teleport" && target) {
        gmApi.teleport && gmApi.teleport(target.user_id, tile.tx, tile.ty);
        toast.success(`Téléportation : ${target.username} → (${tile.tx},${tile.ty})`);
      } else if (kind === "spawn") {
        gmApi.spawnItem && gmApi.spawnItem({
          name: spawnFormRef.current.name, rarity: spawnFormRef.current.rarity,
          icon: spawnFormRef.current.icon, tx: tile.tx, ty: tile.ty,
        });
        toast.success(`Relique invoquée en (${tile.tx},${tile.ty})`);
      }
      setPendingGm(null);
      setGmPickerMode(false);
      if (sceneRef.current) sceneRef.current.gmPickerMode = false;
    };
    const onMoveEmit = (tx, ty, facing) => move(tx, ty, facing);
    const onPortalTravel = (targetId) => {
      toast.info("Traversée dimensionnelle…");
      changeRoom(targetId);
    };

    const sceneData = {
      you: payload.you, room: payload.room,
      players: payload.players, items: payload.items,
      weather: payload.weather,
      onPlayerClick, onTileClick, onMoveEmit, onPortalTravel,
    };

    if (process.env.NODE_ENV === "development" && payload?.you) {
      const u = payload.you;
      console.log("Current user class:", u?.class, u?.classe, u?.character_class, u?.class_id, u?.class_name);
    }

    if (gameRef.current) {
      sceneRef.current = null;
      try {
        gameRef.current.scene.stop("NexusIsoScene");
        gameRef.current.scene.start("NexusIsoScene", sceneData);
      } catch {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    }
    if (!gameRef.current) {
      const config = {
        parent: containerRef.current,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        physics: { default: "arcade", arcade: { debug: false } },
        scene: NexusIsoScene,
        backgroundColor: "#030208",
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        input: { mouse: { preventDefaultDown: true }, activePointers: 3 },
        render: {
          pixelArt: true,
          antialias: false,
          roundPixels: true,
        },
      };
      try {
        setRenderError(null);
        gameRef.current = createPhaserGame(Phaser, config, { forceCanvas });
        gameRef.current.scene.start("NexusIsoScene", sceneData);
      } catch (err) {
        console.error("[Nexus] Phaser init failed:", err);
        setRenderError(err?.message || "WebGL non supporté par ce navigateur");
        return;
      }
      try {
        const canvas = gameRef.current.canvas;
        if (canvas) canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      } catch {}
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
      scene.onBossAttack = () => bossAttack();
      scene.onCombatEnemyClick = (id) => combatTarget(id);
      scene.onCombatAttack = (id) => combatAttack(id);
      scene.gmPickerMode = false;
      if (payload.combat?.enemies?.length) {
        scene.syncCombatEnemies?.(payload.combat.enemies);
      } else if (!payload.room?.combat_active) {
        scene.clearCombatEnemies?.();
      }
      if (payload.room?.world_boss) scene.setWorldBoss?.(payload.room.world_boss);
      if (payload.room?.active_rift) scene.setActiveRift?.(payload.room.active_rift);
    };
    tryReady();
  }, [gmApi, move, pickupItem, changeRoom, bossAttack, combatTarget, combatAttack, openPlayerHeroCard]);

  useEffect(() => {
    if (!overlayOpen || combatDead) return undefined;
    const onKey = (e) => {
      if (e.code === "Space" && !e.repeat) {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        const targetId = combat?.player?.targetId || sceneRef.current?.combatTargetId;
        if (targetId) combatAttack(targetId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen, combatDead, combat, combatAttack]);

  const targetEnemy = combat?.enemies?.find(
    (e) => e.instanceId === (combat?.player?.targetId || sceneRef.current?.combatTargetId),
  );

  useEffect(() => { pendingGmRef.current = pendingGm; }, [pendingGm]);
  useEffect(() => { spawnFormRef.current = spawnForm; }, [spawnForm]);
  useEffect(() => { isStaffRef.current = isStaff; }, [isStaff]);

  useEffect(() => {
    if (!overlayOpen) return undefined;
    const onGfxError = (event) => {
      const msg = String(event?.message || event?.reason?.message || event?.reason || "");
      if (!/webgl unsupported/i.test(msg)) return;
      event.preventDefault?.();
      setRenderError(msg);
      try {
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
          sceneRef.current = null;
        }
      } catch {}
    };
    window.addEventListener("error", onGfxError);
    window.addEventListener("unhandledrejection", onGfxError);
    return () => {
      window.removeEventListener("error", onGfxError);
      window.removeEventListener("unhandledrejection", onGfxError);
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!overlayOpen) {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
      setRenderError(null);
      return;
    }
    if (!room || !you) return;

    let attempts = 0;
    const boot = () => {
      if (!containerRef.current || !overlayOpen) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if ((w < 10 || h < 10) && attempts < 60) {
        attempts += 1;
        requestAnimationFrame(boot);
        return;
      }
      if (w >= 10 && h >= 10) {
        rebuildScene({ room, you, players, items, weather });
      }
    };

    requestAnimationFrame(boot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayOpen, room?.id, you?.sid, weather]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [roomChatMessages]);

  useEffect(() => {
    const blocked = mapOpen || gmOpen || friendsOpen;
    if (sceneRef.current) sceneRef.current.movementBlocked = blocked;
  }, [mapOpen, gmOpen, friendsOpen]);

  useEffect(() => {
    if (!overlayOpen) return;
    api.get("/nexus/rooms").then((r) => setRooms(r.data || [])).catch(() => {});
  }, [overlayOpen]);

  const submitChat = (e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    if (/^\/(help|aide|\?)$/i.test(trimmed)) {
      openChatHelp();
      setText("");
      return;
    }
    if (you?.muted && !isStaff) {
      toast.error("La salle est muette — vous ne pouvez pas écrire.");
      return;
    }
    if (sendRoomChat(trimmed)) {
      emitRoomTyping(false);
      setText("");
    }
  };

  const handleChatTyping = (value) => {
    emitRoomTyping(!!value?.trim());
  };

  const handleSetChatColor = async (hex) => {
    if (isNexusStaff(you)) {
      toast.info("La couleur de tchat est fixée à celle de votre grade de Gardien.");
      return;
    }
    if (!you?.is_vip) {
      toast.error("Couleur de tchat réservée aux VIP.");
      return;
    }
    try {
      patchYou({ nexus_chat_color: hex || null, chat_color: hex || null });
      await api.put("/profile", { nexus_chat_color: hex });
      toast.success(hex ? "Couleur de tchat mise à jour." : "Couleur par défaut restaurée.");
    } catch (err) {
      patchYou({ nexus_chat_color: you?.nexus_chat_color, chat_color: you?.nexus_chat_color });
      toast.error(err.response?.data?.detail || "Impossible de changer la couleur.");
    }
  };

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

  const toggleGodmode = () => {
    const v = !gmGodmode;
    setGmGodmode(v);
    gmApi.godmode && gmApi.godmode(v);
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

  useEffect(() => {
    if (!overlayOpen) return undefined;
    const loadFriendBadge = async () => {
      try {
        const [req, threads, friendsRes] = await Promise.all([
          api.get("/friends/requests/count"),
          api.get("/friends/chat/threads"),
          api.get("/friends"),
        ]);
        const pending = req.data?.count ?? 0;
        const unread = (threads.data || []).reduce((s, t) => s + (t.unread || 0), 0);
        setFriendsBadge(pending + unread);
        setFriendIds((friendsRes.data || []).map((f) => f.user_id));
      } catch { /* ignore */ }
    };
    loadFriendBadge();
    const onUpdate = () => loadFriendBadge();
    window.addEventListener("nexoria:friends-updated", onUpdate);
    return () => window.removeEventListener("nexoria:friends-updated", onUpdate);
  }, [overlayOpen, ns?.pushNotif]);

  const worldReady = status === "online" && room && you;
  const worldClosed = overlayOpen && status === "nexus_closed";
  const worldLoading = overlayOpen && !worldClosed && (status === "connecting" || status === "idle" || (status === "online" && (!room || !you)));
  const worldError = overlayOpen && !worldClosed && (status === "error" || status === "offline");

  const handleRenderRetry = () => {
    setRenderError(null);
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    }
    if (room && you) rebuildScene({ room, you, players, items, weather, forceCanvas: true });
  };

  return (
    <AnimatePresence>
      {overlayOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="nexus-overlay"
          data-testid="nexus-overlay"
        >
          <NexusTopBar
            status={status}
            presence={presence}
            playersCount={players.length}
            mapOpen={mapOpen}
            friendsOpen={friendsOpen}
            friendsBadge={friendsBadge}
            isStaff={isStaff}
            onToggleMap={() => setMapOpen((v) => !v)}
            onToggleFriends={() => setFriendsOpen((v) => !v)}
            onOpenGm={() => { setSelectedTarget(null); setGmOpen(true); }}
            onClose={() => setOverlayOpen(false)}
          />

          <NexusRoomPulse room={room} weather={weather} playersCount={players.length} />

          <AnimatePresence>
            {globalAnnounce && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="nexus-announce"
                data-testid="gm-announce-banner"
              >
                <div className="text-[10px] uppercase tracking-[0.28em] text-amber-200 font-bold flex items-center justify-center gap-2">
                  <Megaphone className="w-3 h-3" /> Décret — {globalAnnounce.by_username}
                </div>
                <div className="text-sm text-amber-50 mt-1 text-center font-medium">{globalAnnounce.text}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="nexus-canvas-zone" ref={containerRef} data-testid="nexus-canvas-wrapper" />

          {worldClosed && <NexusBootClosed html={nexusGate?.html} onClose={() => closeNexus?.()} />}
          {worldLoading && <NexusBootLoading />}
          {renderError && <NexusBootRenderError message={renderError} onRetry={handleRenderRetry} />}
          {worldError && <NexusBootError onRetry={() => reconnectNexus?.()} />}
          {!worldClosed && !worldLoading && !worldError && !worldReady && overlayOpen && <NexusBootWaiting />}

          {worldReady && !renderError && (
            <>
              <NexusSocialDock
                players={players}
                you={you}
                isStaff={isStaff}
                friendIds={friendIds}
                onSelectHero={openPlayerHeroCard}
                onFriendMessage={(p) => {
                  setFriendsChatId(p.user_id);
                  setFriendsTab("chat");
                  setFriendsOpen(true);
                }}
                onGmTarget={(p) => { setSelectedTarget(p); setGmOpen(true); }}
              />

              {(combat?.combatActive || room?.combat_active) && (
                <NexusCombatHud
                  combat={combat}
                  targetEnemy={targetEnemy}
                  onAttack={() => {
                    const id = combat?.player?.targetId || sceneRef.current?.combatTargetId;
                    if (id) combatAttack(id);
                  }}
                  attackCooldown={attackCooldown}
                  dead={combatDead}
                  respawnIn={combatRespawnIn}
                  onRespawn={combatRespawn}
                  lastReward={lastCombatReward}
                />
              )}

              <NexusEventRibbon room={room} />
              <NexusRealmPulse presence={presence} playersCount={players.length} />

              <NexusChatDock
                logOpen={chatLogOpen}
                onToggleLog={() => setChatLogOpen((v) => !v)}
                onOpenHelp={openChatHelp}
                roomName={room?.name || "Salle"}
                messages={roomChatMessages}
                text={text}
                onTextChange={setText}
                onTypingActivity={handleChatTyping}
                onSubmit={submitChat}
                onInsertEmoji={(e) => setText((t) => (t.length < 300 ? t + e : t))}
                chatEndRef={chatEndRef}
                viewerRole={you?.role || "user"}
                viewerIsNexusSupreme={!!you?.is_nexus_supreme}
                chatMuted={!!you?.muted}
                chatMutedUntil={you?.chat_muted_until || null}
                isVip={!!you?.is_vip}
                chatColor={you?.nexus_chat_color || you?.chat_color || null}
                onSetChatColor={handleSetChatColor}
                onDeleteMessage={(messageId) => gmApi.deleteRoomChatMessage?.(messageId)}
              />

              <NexusChatHelpPanel
                open={chatHelpOpen}
                onClose={closeChatHelp}
                role={you?.role || "user"}
                isVip={!!you?.is_vip}
                isNexusSupreme={!!you?.is_nexus_supreme}
              />
            </>
          )}

          {gmPickerMode && (
            <div className="nexus-gm-picker">
              <MapPin className="w-4 h-4" />
              <span>Mode ciblage — cliquez une case sur la carte</span>
              <button
                type="button"
                onClick={() => {
                  setPendingGm(null);
                  setGmPickerMode(false);
                  if (sceneRef.current) sceneRef.current.gmPickerMode = false;
                }}
                className="nexus-icon-btn"
                style={{ width: "1.5rem", height: "1.5rem" }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <NexusMapModal
            open={mapOpen}
            onClose={() => setMapOpen(false)}
            rooms={rooms}
            currentRoom={room?.id}
            onTravel={(id) => { changeRoom(id); setMapOpen(false); }}
          />

          <GmPanel
            open={gmOpen && isStaff}
            onClose={() => setGmOpen(false)}
            target={selectedTarget}
            clearTarget={() => setSelectedTarget(null)}
            weather={weather}
            room={room}
            gm={gmApi}
            liveLogs={gmLogs}
            rooms={rooms}
            requestTilePickFor={requestTilePickFor}
            announceText={announceText}
            setAnnounceText={setAnnounceText}
            submitAnnounce={submitAnnounce}
            popupTitle={popupTitle}
            setPopupTitle={setPopupTitle}
            popupBody={popupBody}
            setPopupBody={setPopupBody}
            submitPopup={submitPopup}
            spawnForm={spawnForm}
            setSpawnForm={setSpawnForm}
            gmInvisible={gmInvisible}
            toggleInvisible={toggleInvisible}
            godmode={gmGodmode}
            toggleGodmode={toggleGodmode}
            onBanClick={() => setBanOpen(true)}
            onInspect={() => { if (selectedTarget) gmApi.inspect?.(selectedTarget.user_id); }}
            players={players}
          />

          <BanModal
            open={banOpen}
            target={selectedTarget}
            onClose={() => setBanOpen(false)}
            onSubmit={submitBan}
            hours={banHours}
            setHours={setBanHours}
            reason={banReason}
            setReason={setBanReason}
          />

          <GmPlayerInspector data={inspectData} onClose={() => setInspectData(null)} tab={inspectTab} setTab={setInspectTab} />
          <PopupNotificationModal popup={popup} onClose={dismissPopup} />

          <NexusFriendsPanel
            open={friendsOpen}
            onClose={() => setFriendsOpen(false)}
            initialTab={friendsTab}
            initialFriendId={friendsChatId}
          />

          <GmContextMenu
            menu={adminMenu}
            onClose={() => setAdminMenu(null)}
            gmApi={gmApi}
            openHeroCard={(uid) => { setAdminMenu(null); openPlayerHeroCard(uid); }}
            openGmPanel={(p) => { setAdminMenu(null); setSelectedTarget(p); setGmOpen(true); }}
            requestTeleport={(p) => { setAdminMenu(null); requestTilePickFor("teleport", p); }}
            teleportToHere={(p) => {
              setAdminMenu(null);
              if (you && gmApi.teleport) {
                gmApi.teleport(p.user_id, you.tx, you.ty);
                toast.success(`${p.username} a été téléporté vers toi`);
              }
            }}
            openBan={(p) => { setAdminMenu(null); setSelectedTarget(p); setBanOpen(true); }}
            inspectPlayer={(p) => { setAdminMenu(null); gmApi.inspect?.(p.user_id); }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BanModal({ open, target, onClose, onSubmit, hours, setHours, reason, setReason }) {
  if (!open || !target) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      data-testid="gm-ban-modal"
    >
      <motion.form
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0A0613] border border-red-500/40 rounded-2xl p-5 max-w-md w-full"
      >
        <div className="flex items-center gap-2 mb-3">
          <Ban className="w-5 h-5 text-red-400" />
          <h3 className="font-display font-bold text-lg text-red-300">Bannir {target.username}</h3>
        </div>
        <label className="block text-xs text-zinc-400 mb-1">Durée</label>
        <select
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-full mb-3 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm"
          data-testid="gm-ban-duration"
        >
          <option value="1">1 heure</option>
          <option value="24">1 jour</option>
          <option value="168">1 semaine</option>
          <option value="720">1 mois</option>
          <option value="8760">1 an</option>
        </select>
        <label className="block text-xs text-zinc-400 mb-1">Raison</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={200}
          placeholder="Raison du bannissement…"
          className="w-full mb-3 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm"
          data-testid="gm-ban-reason"
        />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-2 rounded border border-white/10 text-zinc-300 text-sm">
            Annuler
          </button>
          <button
            type="submit"
            data-testid="gm-ban-submit"
            className="flex-1 px-3 py-2 rounded border border-red-500/60 bg-red-500/20 text-red-200 text-sm font-bold"
          >
            Confirmer
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function PopupNotificationModal({ popup, onClose }) {
  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={onClose}
          data-testid="gm-popup-notif"
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-[#1A0B3D] via-[#0A0613] to-[#1A0B3D] border-2 border-yellow-500/60 rounded-2xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(234,179,8,0.5)]"
          >
            <div className="flex items-center gap-2 text-yellow-300 mb-3">
              <Megaphone className="w-5 h-5" />
              <div className="font-display font-black text-xl">{popup.title}</div>
            </div>
            <div className="text-zinc-200 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{popup.body}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4">
              Décret de {popup.by_username}
            </div>
            <button
              onClick={onClose}
              data-testid="gm-popup-dismiss"
              className="w-full px-4 py-2 rounded border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 font-bold text-sm"
            >
              Compris
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
