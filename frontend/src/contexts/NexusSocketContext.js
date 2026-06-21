import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { getToken } from "@/lib/api";
import api from "@/lib/api";
import { INVENTORY_UPDATED_EVENT } from "@/hooks/useInventorySync";
import { useAuth } from "@/contexts/AuthContext";
import { publishStaffAlert, STAFF_ALERT_KINDS } from "@/lib/staff-alerts";
import { isStaffRole } from "@/lib/staff-roles";

/**
 * NexusSocketContext — owns a SINGLE Socket.IO connection at app-level.
 *
 * Survives navigation between pages so the player stays "in the world" even
 * while browsing the Codex. Exposes everything the Nexus overlay and the
 * notifications bell need (chat, presence, GM events, push notifications).
 */

const NexusSocketContext = createContext(null);
export const useNexusSocket = () => useContext(NexusSocketContext);

const CHANNELS = ["global", "room", "guild", "trade", "event"];

export function NexusSocketProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.user_id ?? null;
  const socketRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | connecting | online | offline | error
  const [room, setRoom] = useState(null);
  const [you, setYou] = useState(null);
  const [players, setPlayers] = useState([]);
  const [weather, setWeather] = useState("clear");
  const [items, setItems] = useState([]);
  const [isStaff, setIsStaff] = useState(false);
  const [roomChatMessages, setRoomChatMessages] = useState([]);
  const [chat, setChat] = useState([]); // legacy multi-channel (conservé pour compat)
  const lastRoomChatSendRef = useRef(0);
  const [activeChannel, setActiveChannel] = useState("room");
  const [unreadByChannel, setUnreadByChannel] = useState({});
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [popup, setPopup] = useState(null); // {title, body, kind, by_username}
  const [globalAnnounce, setGlobalAnnounce] = useState(null);
  const [pushNotif, setPushNotif] = useState(null); // last notif:new doc — bell consumes
  const [friendMessage, setFriendMessage] = useState(null);
  const [presence, setPresence] = useState({
    total: 0, by_room: {}, active_rooms: 0,
    staff_online: { total: 0, by_role: {}, members: [] },
    online_heroes: { total: 0, members: [] },
  });
  const [gmLogs, setGmLogs] = useState([]);
  const [nexusGate, setNexusGate] = useState({ open: true, html: {} });
  const [chatHelpOpen, setChatHelpOpen] = useState(false);
  const [combat, setCombat] = useState(null);
  const [attackCooldown, setAttackCooldown] = useState(false);
  const [combatDead, setCombatDead] = useState(false);
  const [combatRespawnIn, setCombatRespawnIn] = useState(0);
  const [lastCombatReward, setLastCombatReward] = useState(null);

  const userStaff = isStaffRole(user);
  // « Connexion automatique » (tous les utilisateurs) : rejoindre le Nexus ONLINE
  // dès la connexion au site. Quand c'est désactivé, l'utilisateur n'apparaît pas
  // sur le ONLINE tant qu'il n'entre pas manuellement via l'overlay.
  const autoConnect = user?.nexus_auto_connect !== false;
  const nexusGateOpen = nexusGate.open !== false;
  const mayConnectNexus = nexusGateOpen || userStaff;
  const autoConnectSocket = mayConnectNexus && autoConnect;
  const wantWorldPresence = autoConnectSocket || overlayOpen;
  const shouldEstablishSocket = mayConnectNexus;
  const presenceOnlySocket = shouldEstablishSocket && !wantWorldPresence;

  // Refs for movement/scene callbacks
  const sceneApiRef = useRef(null); // scene attaches itself here for player_move / item_spawned etc.
  const playersRef = useRef([]);
  const roomRef = useRef(null);
  const youRef = useRef(null);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { youRef.current = you; }, [you]);

  useEffect(() => {
    if (!combatDead || combatRespawnIn <= 0) return undefined;
    const timer = setTimeout(() => setCombatRespawnIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [combatDead, combatRespawnIn]);

  const typingEmitTimerRef = useRef(null);
  const typingActiveRef = useRef(false);

  const attachScene = useCallback((api) => { sceneApiRef.current = api; }, []);
  const detachScene = useCallback(() => { sceneApiRef.current = null; }, []);

  // ---- Poll Nexus online gate (does not block the rest of the site) ----
  useEffect(() => {
    if (!userId) {
      setNexusGate({ open: true, html: {} });
      return undefined;
    }
    const load = () => {
      api.get("/system/online-gate")
        .then((r) => setNexusGate(r.data))
        .catch(() => setNexusGate({ open: true, html: {} }));
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [userId]);

  // ---- Connect when allowed (auto on login for players / staff opt-in, or manual overlay) ----
  useEffect(() => {
    if (!userId) {
      if (socketRef.current) {
        try { socketRef.current.disconnect(); } catch {}
        socketRef.current = null;
      }
      setStatus("idle");
      setRoom(null);
      setYou(null);
      setPlayers([]);
      setRoomChatMessages([]);
      setFriendMessage(null);
      setOverlayOpen(false);
      return undefined;
    }
    if (!shouldEstablishSocket) {
      if (socketRef.current) {
        try { socketRef.current.disconnect(); } catch {}
        socketRef.current = null;
      }
      setStatus(userStaff && !nexusGateOpen ? "nexus_closed" : "idle");
      setRoom(null);
      setYou(null);
      setPlayers([]);
      return undefined;
    }
    const token = getToken();
    if (!token) {
      setStatus("error");
      return;
    }
    const BACKEND = process.env.REACT_APP_BACKEND_URL;
    if (!BACKEND) {
      console.error("[Nexus] REACT_APP_BACKEND_URL manquant");
      setStatus("error");
      return;
    }
    setStatus("connecting");
    const socket = io(BACKEND, {
      path: "/api/nexus/socket.io",
      auth: { token, presence_only: presenceOnlySocket },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on("connect", () => setStatus("online"));
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", (err) => {
      console.warn("[Nexus] connect_error", err?.message);
      setStatus("error");
    });

    socket.on("room_joined", (payload) => {
      setRoom(payload.room);
      setYou(payload.you);
      setPlayers(payload.players || []);
      const hist = payload.room_chat_history || (payload.chat_history || []).map((m) => ({
        message_id: m.message_id || `legacy_${m.ts}_${m.user_id}`,
        room_id: payload.room?.id,
        room_name: payload.room?.name,
        user_id: m.user_id,
        username: m.username,
        role: m.role,
        class_name: m.class_name,
        level: m.level,
        content: m.text || m.content,
        ts: m.ts,
        created_at: m.created_at,
      }));
      setRoomChatMessages(hist.slice(-50));
      setChat((prev) => {
        const legacy = (payload.chat_history || []).map((m) => ({ ...m, channel: m.channel || "room" }));
        const nonRoom = prev.filter((m) => m.channel && m.channel !== "room");
        return [...nonRoom, ...legacy];
      });
      setWeather(payload.weather || "clear");
      setItems(payload.items || []);
      setIsStaff(!!payload.is_staff);
      if (payload.presence) setPresence(payload.presence);
      if (payload.combat) {
        setCombat(payload.combat);
        setCombatDead(!!payload.combat.player?.isDead);
      } else {
        setCombat(null);
        setCombatDead(false);
      }
      sceneApiRef.current?.onRoomJoined?.(payload);
      if (payload.combat?.enemies?.length) {
        sceneApiRef.current?.syncCombatEnemies?.(payload.combat.enemies);
      } else {
        sceneApiRef.current?.clearCombatEnemies?.();
      }
    });

    socket.on("player_join", (p) => {
      setPlayers((prev) => [...prev.filter((x) => x.sid !== p.sid), p]);
      sceneApiRef.current?.onPlayerJoin?.(p);
    });
    socket.on("player_leave", ({ sid }) => {
      setPlayers((prev) => prev.filter((x) => x.sid !== sid));
      sceneApiRef.current?.onPlayerLeave?.(sid);
    });
    socket.on("player_move", (m) => {
      sceneApiRef.current?.onPlayerMove?.(m);
      setPlayers((prev) => prev.map((p) => {
        if (p.sid !== m.sid) return p;
        const patch = { tx: m.tx, ty: m.ty, facing: m.facing };
        if (m.class_id) patch.class_id = m.class_id;
        if (m.class_name) patch.class_name = m.class_name;
        return { ...p, ...patch };
      }));
    });
    socket.on("player_status", ({ sid, ...patch }) => {
      sceneApiRef.current?.onPlayerStatus?.(sid, patch);
      setPlayers((prev) => prev.map((p) => p.sid === sid ? { ...p, ...patch } : p));
    });
    socket.on("player_typing", ({ sid, typing }) => {
      if (!sid) return;
      sceneApiRef.current?.onPlayerTyping?.(sid, !!typing);
    });
    socket.on("room_chat_message", (msg) => {
      setRoomChatMessages((prev) => {
        const currentRoomId = roomRef.current?.id;
        if (msg.room_id && currentRoomId && msg.room_id !== currentRoomId) return prev;
        const dup = prev.some(
          (m) => !m.pending && m.message_id === msg.message_id,
        ) || prev.some(
          (m) => m.pending && m.user_id === msg.user_id && m.content === msg.content && Math.abs((m.ts || 0) - (msg.ts || 0)) < 3,
        );
        if (dup) {
          return prev.map((m) => (
            m.pending && m.user_id === msg.user_id && m.content === (msg.content || msg.text)
              ? { ...msg, pending: false }
              : m
          )).slice(-50);
        }
        return [...prev.filter((m) => !m.pending || m.content !== (msg.content || msg.text)), msg].slice(-50);
      });
      const sender = playersRef.current.find((p) => p.user_id === msg.user_id);
      if (sender) {
        sceneApiRef.current?.onPlayerTyping?.(sender.sid, false);
        if (msg.user_id !== youRef.current?.user_id) {
          sceneApiRef.current?.onChatBubble?.(sender.sid, msg.content || msg.text, msg.role);
        }
      }
    });
    socket.on("room_chat_history", ({ messages }) => {
      setRoomChatMessages((messages || []).slice(-50));
    });
    socket.on("room_chat_message_deleted", ({ message_id }) => {
      setRoomChatMessages((prev) => prev.filter((m) => m.message_id !== message_id));
    });
    socket.on("room_chat_cleared", ({ room_id }) => {
      if (!room_id || roomRef.current?.id === room_id) {
        setRoomChatMessages([]);
      }
    });
    socket.on("nexus_chat_help", () => {
      setChatHelpOpen(true);
    });
    socket.on("room_chat_user_muted", ({ user_id, bulk, room_id, until }) => {
      if (bulk) {
        if (room_id && roomRef.current?.id && roomRef.current.id !== room_id) return;
        setPlayers((prev) => prev.map((p) => (
          isStaffRole(p.role) ? p : { ...p, muted: true, chat_muted_until: until || p.chat_muted_until }
        )));
        setYou((prev) => (
          prev && !isStaffRole(prev.role)
            ? { ...prev, muted: true, chat_muted_until: until || prev.chat_muted_until }
            : prev
        ));
        return;
      }
      if (!user_id) return;
      setPlayers((prev) => prev.map((p) => (
        p.user_id === user_id ? { ...p, muted: true, chat_muted_until: until || p.chat_muted_until } : p
      )));
      setYou((prev) => (
        prev?.user_id === user_id ? { ...prev, muted: true, chat_muted_until: until || prev.chat_muted_until } : prev
      ));
    });
    socket.on("room_chat_user_unmuted", ({ user_id, bulk, room_id }) => {
      if (bulk) {
        if (room_id && roomRef.current?.id && roomRef.current.id !== room_id) return;
        setPlayers((prev) => prev.map((p) => (
          isStaffRole(p.role) ? p : { ...p, muted: false, chat_muted_until: null }
        )));
        setYou((prev) => (
          prev && !isStaffRole(prev.role) ? { ...prev, muted: false, chat_muted_until: null } : prev
        ));
        return;
      }
      if (!user_id) return;
      setPlayers((prev) => prev.map((p) => (p.user_id === user_id ? { ...p, muted: false, chat_muted_until: null } : p)));
      setYou((prev) => (prev?.user_id === user_id ? { ...prev, muted: false, chat_muted_until: null } : prev));
    });
    socket.on("chat", (msg) => {
      const ch = msg.channel || "room";
      if (ch === "room") {
        const normalized = {
          message_id: msg.message_id || `legacy_${msg.ts}_${msg.user_id}`,
          room_id: msg.room_id || roomRef.current?.id,
          user_id: msg.user_id,
          username: msg.username,
          role: msg.role,
          is_nexus_supreme: msg.is_nexus_supreme,
          class_name: msg.class_name,
          level: msg.level,
          rank: msg.rank,
          is_vip: msg.is_vip,
          chat_color: msg.chat_color || msg.nexus_chat_color,
          content: msg.text || msg.content,
          ts: msg.ts,
        };
        setRoomChatMessages((prev) => {
          const withoutPending = prev.filter(
            (m) => !(m.pending && m.content === normalized.content && m.user_id === normalized.user_id),
          );
          const exists = withoutPending.some(
            (m) => (m.message_id && m.message_id === normalized.message_id)
              || (m.content === normalized.content && m.user_id === normalized.user_id && Math.abs((m.ts || 0) - (normalized.ts || 0)) < 3),
          );
          if (exists) return withoutPending;
          return [...withoutPending, normalized].slice(-50);
        });
        const sender = playersRef.current.find((p) => p.user_id === msg.user_id);
        if (sender) {
          sceneApiRef.current?.onPlayerTyping?.(sender.sid, false);
          if (msg.user_id !== youRef.current?.user_id) {
            sceneApiRef.current?.onChatBubble?.(sender.sid, normalized.content, msg.role);
          }
        }
      }
      setChat((prev) => [...prev.slice(-300), { ...msg, channel: ch }]);
      if (ch !== "room") {
        const sender = playersRef.current.find((p) => p.user_id === msg.user_id);
        if (sender && (ch === "global" || ch === "trade" || ch === "event")) {
          sceneApiRef.current?.onChatBubble?.(sender.sid, msg.text, msg.role);
        }
      }
      setUnreadByChannel((u) => ({ ...u, [ch]: (u[ch] || 0) + 1 }));
    });
    socket.on("system_msg", (m) => {
      if (window.location.pathname === "/maintenance") return;
      const chatRejected = m.kind === "warn" && /message|patience|refusé|vide|répété/i.test(m.text || "");
      if (chatRejected) {
        setRoomChatMessages((prev) => {
          let idx = -1;
          for (let i = prev.length - 1; i >= 0; i -= 1) {
            if (prev[i]?.pending) { idx = i; break; }
          }
          if (idx === -1) return prev;
          return prev.filter((_, i) => i !== idx);
        });
      }
      if (m.kind === "error" || m.kind === "muted") toast.error(m.text);
      else if (m.kind === "ok" || m.kind === "info" || m.kind === "pickup") toast.success(m.text);
      else if (m.kind === "warn") (toast.warning || toast)(m.text);
    });
    socket.on("gm_announce", (a) => {
      setGlobalAnnounce(a);
      setTimeout(() => setGlobalAnnounce(null), 8000);
    });
    socket.on("gm_popup", (p) => {
      setPopup(p);
      try { sfx.click(); } catch {}
    });
    socket.on("weather", ({ weather: w }) => {
      setWeather(w);
      sceneApiRef.current?.onWeather?.(w);
    });
    socket.on("item_spawned", (item) => {
      setItems((prev) => [...prev, item]);
      sceneApiRef.current?.onItemSpawned?.(item);
    });
    socket.on("item_removed", ({ item_id }) => {
      setItems((prev) => prev.filter((i) => i.item_id !== item_id));
      sceneApiRef.current?.onItemRemoved?.(item_id);
    });
    socket.on("kicked", ({ reason }) => {
      toast.error(`Vous avez été expulsé du Nexus : ${reason}`);
      setOverlayOpen(false);
    });
    socket.on("error_msg", ({ reason }) => toast.error(`Erreur Nexus : ${reason}`));

    // Push notifications — bell consumes
    socket.on("notification:new", (doc) => {
      setPushNotif(doc);
      try { sfx.click(); } catch {}
      publishStaffAlert(doc);
    });

    socket.on("friend_message:new", (msg) => {
      setFriendMessage(msg);
      try { sfx.click(); } catch {}
    });

    socket.on("friend:presence", (payload) => {
      if (!payload?.user_id) return;
      window.dispatchEvent(new CustomEvent("nexoria:friend-presence", { detail: payload }));
    });

    // Combat — room-scoped realtime
    socket.on("combat:state", (st) => {
      setCombat(st);
      if (st?.player) setCombatDead(!!st.player.isDead);
      if (st?.enemies) sceneApiRef.current?.syncCombatEnemies?.(st.enemies);
    });
    socket.on("combat:enemy_spawned", (enemy) => {
      sceneApiRef.current?.upsertCombatEnemy?.(enemy);
      setCombat((prev) => {
        if (!prev) return prev;
        const enemies = [...(prev.enemies || []).filter((e) => e.instanceId !== enemy.instanceId), enemy];
        return { ...prev, enemies };
      });
    });
    socket.on("combat:enemy_updated", (enemy) => {
      sceneApiRef.current?.upsertCombatEnemy?.(enemy);
      setCombat((prev) => {
        if (!prev) return prev;
        const enemies = (prev.enemies || []).map((e) => (e.instanceId === enemy.instanceId ? enemy : e));
        return { ...prev, enemies };
      });
    });
    socket.on("combat:enemy_damaged", (data) => {
      sceneApiRef.current?.showCombatDamage?.(data.tx, data.ty, data.damage, data.critical);
      setCombat((prev) => {
        if (!prev) return prev;
        const enemies = (prev.enemies || []).map((e) => (
          e.instanceId === data.instanceId
            ? { ...e, currentHp: data.currentHp, maxHp: data.maxHp }
            : e
        ));
        return { ...prev, enemies };
      });
    });
    socket.on("combat:enemy_dead", ({ instanceId }) => {
      sceneApiRef.current?.removeCombatEnemy?.(instanceId);
      setCombat((prev) => {
        if (!prev) return prev;
        return { ...prev, enemies: (prev.enemies || []).filter((e) => e.instanceId !== instanceId) };
      });
    });
    socket.on("combat:player_damaged", (data) => {
      sceneApiRef.current?.flashPlayerDamage?.();
      setCombat((prev) => {
        if (!prev?.player) return prev;
        return { ...prev, player: { ...prev.player, hp: data.hp, maxHp: data.maxHp } };
      });
      if (data.damage) toast.error(`-${data.damage} PV (${data.enemyName || "ennemi"})`);
    });
    socket.on("combat:player_dead", (data) => {
      setCombatDead(true);
      setCombatRespawnIn(data.respawnIn || 5);
      toast.error("Vous êtes tombé au combat.");
    });
    socket.on("combat:player_respawned", (data) => {
      setCombatDead(false);
      setCombatRespawnIn(0);
      setCombat((prev) => {
        if (!prev?.player) return prev;
        return {
          ...prev,
          player: {
            ...prev.player,
            hp: data?.hp ?? prev.player.hp,
            maxHp: data?.maxHp ?? prev.player.maxHp,
            isDead: false,
            targetId: null,
          },
        };
      });
      if (data?.sid != null) {
        sceneApiRef.current?.onPlayerMove?.({
          sid: data.sid,
          tx: data.tx,
          ty: data.ty,
          teleport: true,
        });
      }
    });
    socket.on("combat:reward", ({ enemyName, reward }) => {
      setLastCombatReward(reward);
      setTimeout(() => setLastCombatReward(null), 5000);
      toast.success(`Victoire : ${enemyName} — +${reward?.xp} XP, +${reward?.aether} Écus`);
    });

    // Presence update — global hero counter
    socket.on("presence:update", (p) => {
      setPresence(p);
      try {
        window.dispatchEvent(new CustomEvent("nexoria:presence-updated", { detail: p }));
      } catch {}
    });

    // World events
    socket.on("world_boss_spawn", (boss) => {
      toast.error(`⚔️ Le boss "${boss.name}" est apparu dans ${boss.room} !`, { duration: 8000 });
      try { sfx.fanfare?.(); } catch {}
    });
    socket.on("rift_open", (rift) => {
      toast.warning?.(`🌀 Faille dimensionnelle ouverte par ${rift.by_username}`, { duration: 6000 });
    });
    socket.on("world_boss_update", (data) => {
      sceneApiRef.current?.onWorldBossUpdate?.(data);
    });
    socket.on("rift_update", (data) => {
      sceneApiRef.current?.onRiftUpdate?.(data);
    });
    socket.on("gm_log:new", (entry) => {
      setGmLogs((prev) => [entry, ...prev].slice(0, 120));
    });

    // Inventory sync — shop, chest, pickup, GM grant (no page refresh)
    socket.on("inventory:updated", (data) => {
      try {
        window.dispatchEvent(new CustomEvent(INVENTORY_UPDATED_EVENT, { detail: data }));
      } catch {}
      try { sfx.chime?.() || sfx.chest?.(); } catch {}
    });

    socket.on("profile:updated", (data) => {
      try {
        window.dispatchEvent(new CustomEvent("nexoria:profile:updated", { detail: data }));
      } catch {}
      const patch = {
        ...data,
        nexus_chat_color: data.nexus_chat_color ?? data.chat_color,
      };
      setYou((prev) => (prev && data?.user_id === prev.user_id ? { ...prev, ...patch } : prev));
      setPlayers((prev) => prev.map((p) => (p.user_id === data?.user_id ? { ...p, ...patch } : p)));
      const youNow = youRef.current;
      const sid = data?.user_id === youNow?.user_id
        ? youNow?.sid
        : playersRef.current.find((p) => p.user_id === data?.user_id)?.sid;
      sceneApiRef.current?.onPlayerProfile?.(sid ? { sid, ...patch } : patch);
    });

    socket.on("player_profile", (patch) => {
      if (!patch?.sid) return;
      setPlayers((prev) => prev.map((p) => (p.sid === patch.sid ? { ...p, ...patch } : p)));
      setYou((prev) => (prev?.sid === patch.sid ? { ...prev, ...patch } : prev));
      sceneApiRef.current?.onPlayerProfile?.(patch);
    });

    // Shop purchase sync — legacy alias; also dispatches inventory:updated above from backend
    socket.on("shop:purchased", (data) => {
      try {
        window.dispatchEvent(new CustomEvent("nexoria:shop:purchased", { detail: data }));
      } catch {}
      try { sfx.chime?.() || sfx.click?.(); } catch {}
    });

    return () => {
      try { socket.disconnect(); } catch {}
      socketRef.current = null;
    };
  }, [userId, shouldEstablishSocket, presenceOnlySocket, userStaff, nexusGateOpen]);

  // ---- API exposed to consumers ----
  const notifyPlayerTyping = useCallback((sid, typing) => {
    if (!sid) return;
    sceneApiRef.current?.onPlayerTyping?.(sid, typing);
  }, []);

  const stopRoomTyping = useCallback(() => {
    clearTimeout(typingEmitTimerRef.current);
    typingEmitTimerRef.current = null;
    if (!typingActiveRef.current) return;
    typingActiveRef.current = false;
    const sid = youRef.current?.sid;
    socketRef.current?.emit("room_chat_typing", { typing: false });
    notifyPlayerTyping(sid, false);
  }, [notifyPlayerTyping]);

  const emitRoomTyping = useCallback((active) => {
    const socket = socketRef.current;
    const sid = youRef.current?.sid;
    if (!socket || !sid) return;

    clearTimeout(typingEmitTimerRef.current);
    typingEmitTimerRef.current = null;

    if (active) {
      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        socket.emit("room_chat_typing", { typing: true });
        notifyPlayerTyping(sid, true);
      }
      typingEmitTimerRef.current = setTimeout(() => {
        stopRoomTyping();
      }, 3000);
      return;
    }
    stopRoomTyping();
  }, [stopRoomTyping, notifyPlayerTyping]);

  const sendRoomChat = useCallback((text) => {
    const content = text?.trim();
    if (!content) return false;
    const socket = socketRef.current;
    if (!socket?.connected) {
      toast.error("Connexion Nexus indisponible.");
      return false;
    }
    const youNow = youRef.current;
    if (!youNow?.user_id) {
      toast.error("Connexion à la salle en cours…");
      return false;
    }
    const now = Date.now();
    if (now - lastRoomChatSendRef.current < 1000) {
      toast.error("Patience — un message par seconde.");
      return false;
    }
    lastRoomChatSendRef.current = now;

    if (/^\/(help|aide|\?)$/i.test(content)) {
      setChatHelpOpen(true);
      return true;
    }

    const staff = isStaffRole(youNow.role);
    if (youNow.muted && !staff) {
      toast.error("La salle est muette — vous ne pouvez pas écrire.");
      return false;
    }

    const isCommand = content.startsWith("/");
    const roomId = roomRef.current?.id;

    if (!isCommand) {
      setRoomChatMessages((prev) => [...prev, {
        message_id: `local_${now}`,
        room_id: roomId,
        user_id: youNow.user_id,
        username: youNow.username || "Vous",
        role: youNow.role || "user",
        level: youNow.level,
        rank: youNow.rank,
        is_vip: youNow.is_vip,
        chat_color: youNow.nexus_chat_color,
        content,
        ts: now / 1000,
        pending: true,
      }].slice(-50));
    }

    socket.emit("chat", { text: content, channel: "room" });
    stopRoomTyping();
    if (!isCommand && youNow.sid) {
      sceneApiRef.current?.onChatBubble?.(youNow.sid, content, youNow.role);
    }
    return true;
  }, [stopRoomTyping]);

  const sendChat = useCallback((text, channel = "room") => {
    if (channel === "room" || !channel) {
      return sendRoomChat(text);
    }
    if (!text?.trim() || !socketRef.current) return;
    socketRef.current.emit("chat", { text: text.trim(), channel });
  }, [sendRoomChat]);

  const move = useCallback((tx, ty, facing) => {
    socketRef.current?.emit("move", { tx, ty, facing });
  }, []);

  const changeRoom = useCallback((roomId) => {
    socketRef.current?.emit("change_room", { room: roomId });
  }, []);

  const pickupItem = useCallback((itemId) => {
    socketRef.current?.emit("pickup_item", { item_id: itemId });
  }, []);

  const bossAttack = useCallback((damage) => {
    socketRef.current?.emit("boss_attack", { damage });
  }, []);

  const combatTarget = useCallback((targetId) => {
    socketRef.current?.emit("combat:target", { targetId });
    sceneApiRef.current?.setCombatTarget?.(targetId);
  }, []);

  const combatAttack = useCallback((targetId) => {
    if (attackCooldown) return;
    socketRef.current?.emit("combat:attack", { targetId });
    setAttackCooldown(true);
    setTimeout(() => setAttackCooldown(false), 1000);
  }, [attackCooldown]);

  const combatRespawn = useCallback(() => {
    socketRef.current?.emit("combat:respawn");
  }, []);

  const combatRequestState = useCallback(() => {
    socketRef.current?.emit("combat:request_state");
  }, []);

  const gm = useMemo(() => ({
    teleport: (target_user_id, tx, ty) => socketRef.current?.emit("gm_teleport", { target_user_id, tx, ty }),
    tpToPlayer: (target_user_id) => socketRef.current?.emit("gm_tp_to_player", { target_user_id }),
    tpPlayerToMe: (target_user_id) => socketRef.current?.emit("gm_tp_player_to_me", { target_user_id }),
    kick: (target_user_id, reason = "") => socketRef.current?.emit("gm_kick", { target_user_id, reason }),
    mute: (target_user_id, muted) => socketRef.current?.emit("gm_mute", { target_user_id, muted }),
    freeze: (target_user_id, frozen) => socketRef.current?.emit("gm_freeze", { target_user_id, frozen }),
    invisible: (invisible) => socketRef.current?.emit("gm_invisible", { invisible }),
    weather: (weather, roomId) => socketRef.current?.emit("gm_weather", { weather, room: roomId }),
    spawnItem: (payload) => socketRef.current?.emit("gm_spawn_item", payload),
    ban: (target_user_id, duration_hours, reason) => socketRef.current?.emit("gm_ban", { target_user_id, duration_hours, reason }),
    announce: (text) => socketRef.current?.emit("gm_announce", { text }),
    popup: (title, body, kind = "info") => socketRef.current?.emit("gm_popup_notify", { title, body, kind }),
    inspect: (target_user_id) => socketRef.current?.emit("gm_inspect", { target_user_id }),
    giveAether: (target_user_id, amount) => socketRef.current?.emit("gm_give_aether", { target_user_id, amount }),
    giveItem: (target_user_id, payload) => socketRef.current?.emit("gm_give_item", { target_user_id, ...payload }),
    prison: (target_user_id, duration_min) => socketRef.current?.emit("gm_prison", { target_user_id, duration_min }),
    worldBoss: (name, hp) => socketRef.current?.emit("gm_world_boss", { name, hp }),
    rift: (room) => socketRef.current?.emit("gm_rift", { room }),
    observe: (target_user_id) => socketRef.current?.emit("gm_observe", { target_user_id }),
    resetRoom: (room) => socketRef.current?.emit("gm_reset_room", { room }),
    invasion: (count = 6) => socketRef.current?.emit("gm_invasion", { count }),
    godmode: (enabled) => socketRef.current?.emit("gm_godmode", { enabled }),
    deleteRoomChatMessage: (message_id, reason = "") => socketRef.current?.emit("gm_room_chat_delete", { message_id, reason }),
    muteRoomChatUser: (target_user_id, duration_minutes = 5, reason = "") => socketRef.current?.emit("gm_room_chat_mute", { target_user_id, duration_minutes, reason }),
    unmuteRoomChatUser: (target_user_id) => socketRef.current?.emit("gm_room_chat_unmute", { target_user_id }),
  }), []);

  const onInspectResult = useCallback((handler) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on("gm_inspect_result", handler);
    return () => socketRef.current?.off("gm_inspect_result", handler);
  }, []);

  const markChannelRead = useCallback((ch) => {
    setUnreadByChannel((u) => ({ ...u, [ch]: 0 }));
  }, []);

  // When user closes the popup
  const dismissPopup = useCallback(() => setPopup(null), []);

  // The push notif "slot" — bell clears once consumed
  const consumePushNotif = useCallback(() => setPushNotif(null), []);
  const consumeFriendMessage = useCallback(() => setFriendMessage(null), []);

  const openChatHelp = useCallback(() => setChatHelpOpen(true), []);
  const closeChatHelp = useCallback(() => setChatHelpOpen(false), []);

  const patchYou = useCallback((patch) => {
    setYou((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      youRef.current = next;
      if (next.sid) {
        setPlayers((pls) => pls.map((p) => (p.sid === next.sid ? { ...p, ...patch } : p)));
        sceneApiRef.current?.onPlayerProfile?.({ sid: next.sid, ...patch });
      }
      return next;
    });
  }, []);
  const openNexus = useCallback(() => setOverlayOpen(true), []);
  const closeNexus = useCallback(() => setOverlayOpen(false), []);

  const reconnectNexus = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    setStatus("connecting");
    if (socket.connected) socket.disconnect();
    socket.connect();
  }, []);

  // Tenter une reconnexion à l'ouverture de l'overlay si le socket est coupé
  const prevOverlayOpen = useRef(false);
  useEffect(() => {
    if (overlayOpen && !prevOverlayOpen.current && userId && shouldEstablishSocket && (status === "offline" || status === "error")) {
      reconnectNexus();
    }
    prevOverlayOpen.current = overlayOpen;
  }, [overlayOpen, userId, status, reconnectNexus, shouldEstablishSocket]);

  // Écoute globale pour ouvrir le Nexus (sidebar Mode Dieu, carte, etc.)
  useEffect(() => {
    const onOpen = () => setOverlayOpen(true);
    window.addEventListener("nexoria:open-nexus", onOpen);
    return () => window.removeEventListener("nexoria:open-nexus", onOpen);
  }, []);

  // Mise à jour immédiate du sprite Nexus après changement de classe (carte héros / page Hero)
  useEffect(() => {
    const onClassChanged = (e) => {
      const data = e.detail;
      if (!data?.user_id || !data?.class_id) return;
      const patch = {
        user_id: data.user_id,
        class_id: data.class_id,
        class_name: data.class_name,
        avatar_url: data.avatar_url,
      };
      setYou((prev) => (prev?.user_id === data.user_id ? { ...prev, ...patch } : prev));
      setPlayers((prev) => prev.map((p) => (p.user_id === data.user_id ? { ...p, ...patch } : p)));
      const youNow = youRef.current;
      const sid = data.user_id === youNow?.user_id
        ? youNow?.sid
        : playersRef.current.find((p) => p.user_id === data.user_id)?.sid;
      sceneApiRef.current?.onPlayerProfile?.(sid ? { sid, ...patch } : patch);
    };
    window.addEventListener("nexoria:nexus-class-changed", onClassChanged);
    return () => window.removeEventListener("nexoria:nexus-class-changed", onClassChanged);
  }, []);

  const value = useMemo(() => ({
    socket: socketRef.current,
    status, room, you, players, weather, items, isStaff,
    roomChatMessages, sendRoomChat, emitRoomTyping,
    chat, channels: CHANNELS, activeChannel, setActiveChannel,
    unreadByChannel, markChannelRead,
    overlayOpen, setOverlayOpen, openNexus, closeNexus, reconnectNexus,
    chatHelpOpen, openChatHelp, closeChatHelp, patchYou,
    nexusGate,
    popup, dismissPopup, globalAnnounce,
    pushNotif, consumePushNotif,
    friendMessage, consumeFriendMessage,
    presence,
    gmLogs,
    sendChat, emitRoomTyping, move, changeRoom, pickupItem, bossAttack,
    gm, onInspectResult,
    attachScene, detachScene,
    combat, combatTarget, combatAttack, combatRespawn, combatRequestState,
    attackCooldown, combatDead, combatRespawnIn, lastCombatReward,
  }), [
    status, room, you, players, weather, items, isStaff, roomChatMessages, chat, activeChannel,
    unreadByChannel, overlayOpen, popup, globalAnnounce, pushNotif, friendMessage, presence, gmLogs, nexusGate, chatHelpOpen,
    combat, attackCooldown, combatDead, combatRespawnIn, lastCombatReward,
    sendChat, sendRoomChat, emitRoomTyping, move, changeRoom, pickupItem, bossAttack, gm, onInspectResult, attachScene,
    openChatHelp, closeChatHelp, patchYou,
    detachScene, markChannelRead, dismissPopup, consumePushNotif, consumeFriendMessage, openNexus, closeNexus, reconnectNexus,
    combatTarget, combatAttack, combatRespawn, combatRequestState,
  ]);

  return <NexusSocketContext.Provider value={value}>{children}</NexusSocketContext.Provider>;
}
