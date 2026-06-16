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

const CHANNELS = ["global", "room", "guild", "whisper", "trade", "event"];

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
  const [chat, setChat] = useState([]); // flat list across channels with .channel field
  const [activeChannel, setActiveChannel] = useState("room");
  const [whisperTarget, setWhisperTarget] = useState(null); // {user_id, username}
  const [unreadByChannel, setUnreadByChannel] = useState({});
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [popup, setPopup] = useState(null); // {title, body, kind, by_username}
  const [globalAnnounce, setGlobalAnnounce] = useState(null);
  const [pushNotif, setPushNotif] = useState(null); // last notif:new doc — bell consumes
  const [friendMessage, setFriendMessage] = useState(null);
  const [presence, setPresence] = useState({ total: 0, by_room: {}, active_rooms: 0, staff_online: { total: 0, by_role: {}, members: [] } });
  const [gmLogs, setGmLogs] = useState([]);
  const [nexusGate, setNexusGate] = useState({ open: true, html: {} });

  const userStaff = isStaffRole(user);
  const staffAutoConnect = user?.staff_nexus_auto_connect !== false;
  const nexusGateOpen = nexusGate.open !== false;
  const mayConnectNexus = nexusGateOpen || userStaff;
  const autoConnectSocket = userStaff ? staffAutoConnect : nexusGateOpen;
  const shouldEstablishSocket = mayConnectNexus && (autoConnectSocket || overlayOpen);

  // Refs for movement/scene callbacks
  const sceneApiRef = useRef(null); // scene attaches itself here for player_move / item_spawned etc.
  const playersRef = useRef([]);
  useEffect(() => { playersRef.current = players; }, [players]);

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
      setChat([]);
      setFriendMessage(null);
      setWhisperTarget(null);
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
      auth: { token },
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
      // Seed chat history (room channel)
      setChat((prev) => {
        const hist = (payload.chat_history || []).map((m) => ({ ...m, channel: m.channel || "room" }));
        // Preserve any cross-channel messages from before room switch
        const nonRoom = prev.filter((m) => m.channel && m.channel !== "room");
        return [...nonRoom, ...hist];
      });
      setWeather(payload.weather || "clear");
      setItems(payload.items || []);
      setIsStaff(!!payload.is_staff);
      if (payload.presence) setPresence(payload.presence);
      sceneApiRef.current?.onRoomJoined?.(payload);
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
      setPlayers((prev) => prev.map((p) => p.sid === m.sid ? { ...p, tx: m.tx, ty: m.ty, facing: m.facing } : p));
    });
    socket.on("player_status", ({ sid, ...patch }) => {
      sceneApiRef.current?.onPlayerStatus?.(sid, patch);
      setPlayers((prev) => prev.map((p) => p.sid === sid ? { ...p, ...patch } : p));
    });
    socket.on("chat", (msg) => {
      const ch = msg.channel || "room";
      setChat((prev) => [...prev.slice(-300), { ...msg, channel: ch }]);
      // Bubble above sender on canvas
      const sender = playersRef.current.find((p) => p.user_id === msg.user_id);
      if (sender && (ch === "room" || ch === "global" || ch === "trade" || ch === "event")) {
        sceneApiRef.current?.onChatBubble?.(sender.sid, msg.text);
      }
      // Update unread counter if channel isn't focused or overlay closed
      setUnreadByChannel((u) => ({ ...u, [ch]: (u[ch] || 0) + 1 }));
    });
    socket.on("system_msg", (m) => {
      if (window.location.pathname === "/maintenance") return;
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

    // Presence update — global hero counter
    socket.on("presence:update", (p) => setPresence(p));

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
      setYou((prev) => (prev && data?.user_id === prev.user_id ? { ...prev, ...data } : prev));
      setPlayers((prev) => prev.map((p) => (p.user_id === data?.user_id ? { ...p, ...data } : p)));
      sceneApiRef.current?.onPlayerProfile?.(data);
    });

    socket.on("player_profile", (patch) => {
      if (!patch?.sid) return;
      setPlayers((prev) => prev.map((p) => (p.sid === patch.sid ? { ...p, ...patch } : p)));
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
  }, [userId, shouldEstablishSocket, userStaff, nexusGateOpen]);

  // ---- API exposed to consumers ----
  const sendChat = useCallback((text, channel = "room", targetUserId = null) => {
    if (!text?.trim() || !socketRef.current) return;
    const payload = { text: text.trim(), channel };
    if (channel === "whisper" && targetUserId) payload.target_user_id = targetUserId;
    socketRef.current.emit("chat", payload);
  }, []);

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

  const value = useMemo(() => ({
    socket: socketRef.current,
    status, room, you, players, weather, items, isStaff,
    chat, channels: CHANNELS, activeChannel, setActiveChannel,
    whisperTarget, setWhisperTarget, unreadByChannel, markChannelRead,
    overlayOpen, setOverlayOpen, openNexus, closeNexus, reconnectNexus,
    nexusGate,
    popup, dismissPopup, globalAnnounce,
    pushNotif, consumePushNotif,
    friendMessage, consumeFriendMessage,
    presence,
    gmLogs,
    sendChat, move, changeRoom, pickupItem, bossAttack,
    gm, onInspectResult,
    attachScene, detachScene,
  }), [
    status, room, you, players, weather, items, isStaff, chat, activeChannel,
    whisperTarget, unreadByChannel, overlayOpen, popup, globalAnnounce, pushNotif, friendMessage, presence, gmLogs, nexusGate,
    sendChat, move, changeRoom, pickupItem, bossAttack, gm, onInspectResult, attachScene,
    detachScene, markChannelRead, dismissPopup, consumePushNotif, consumeFriendMessage, openNexus, closeNexus, reconnectNexus,
  ]);

  return <NexusSocketContext.Provider value={value}>{children}</NexusSocketContext.Provider>;
}
