import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Users, Globe2, Wifi, WifiOff, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import api, { getToken } from "@/lib/api";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";
import StarField from "@/components/StarField";
import { useAuth } from "@/contexts/AuthContext";
import HeroName from "@/components/HeroName";

const CLASS_COLOR = {
  mage: 0x9D4CDD, warrior: 0xEF4444, assassin: 0x71717A, paladin: 0xEAB308,
  alchemist: 0x10B981, explorer: 0x00BFFF, necromancer: 0x7928CA,
  architect: 0xA855F7, chronomancer: 0x00E5FF, inventor: 0xFFD700,
};

const ROLE_BORDER = { admin: 0xFFD700, moderator: 0xF97316 };

class NexusScene extends Phaser.Scene {
  constructor() { super("NexusScene"); }
  init(data) {
    this.socket = data.socket;
    this.you = data.you;
    this.room = data.room;
    this.players = {};
    this.targetX = null; this.targetY = null;
    this.lastEmit = 0;
    this.onChatBubble = data.onChatBubble;
  }
  create() {
    const { room } = this;
    // Cosmic background
    this.cameras.main.setBackgroundColor("#030305");
    // Grid of glowing dots
    const g = this.add.graphics();
    g.fillStyle(0xA855F7, 0.05);
    for (let x = 0; x < room.width; x += 40) {
      for (let y = 0; y < room.height; y += 40) {
        g.fillCircle(x, y, 1);
      }
    }
    // Soft radial gradient via large translucent circles
    const center = this.add.graphics();
    center.fillStyle(0x00E5FF, 0.05).fillCircle(room.width / 2, room.height / 2, 280);
    center.fillStyle(0x9D4CDD, 0.04).fillCircle(room.width / 2, room.height / 2, 180);
    // Room name
    this.add.text(room.width / 2, 40, room.name.toUpperCase(), {
      fontFamily: "Cinzel, serif", fontSize: "20px", color: "#00E5FF", letterSpacing: 8,
    }).setOrigin(0.5).setAlpha(0.7);
    this.add.text(room.width / 2, 70, `« ${room.description} »`, {
      fontFamily: "Cinzel, serif", fontSize: "12px", color: "#9CA3AF", fontStyle: "italic",
    }).setOrigin(0.5);

    // World bounds
    this.physics.world.setBounds(0, 0, room.width, room.height);

    // Click to move
    this.input.on("pointerdown", (pointer) => {
      this.targetX = pointer.worldX;
      this.targetY = pointer.worldY;
    });
  }

  upsertPlayer(p) {
    if (!p) return;
    if (this.players[p.sid]) {
      this.movePlayer(p.sid, p.x, p.y);
      return;
    }
    const container = this.add.container(p.x, p.y);
    const color = CLASS_COLOR[p.class_id] || 0x9CA3AF;
    const ring = ROLE_BORDER[p.role];
    // Glow halo
    const halo = this.add.circle(0, 0, 22, color, 0.18);
    // Body
    const body = this.add.circle(0, 0, 14, color, 1);
    body.setStrokeStyle(ring ? 3 : 1.5, ring || 0xFFFFFF, ring ? 1 : 0.6);
    // Name
    const name = this.add.text(0, -32,
      `${p.role === "admin" ? "👑 " : p.role === "moderator" ? "🛡️ " : ""}${p.username}`,
      { fontFamily: "Cinzel, serif", fontSize: "12px", color: ring ? "#FFD700" : "#FFFFFF", fontStyle: "bold" }
    ).setOrigin(0.5);
    // Class / level
    const sub = this.add.text(0, -19, `${p.class_name} · ${p.level}`, {
      fontFamily: "ui-monospace, monospace", fontSize: "9px", color: "#00E5FF",
    }).setOrigin(0.5);
    container.add([halo, body, body, sub, name]);
    // Pulse halo
    this.tweens.add({ targets: halo, scaleX: 1.3, scaleY: 1.3, alpha: 0.05, yoyo: true, repeat: -1, duration: 1200 });
    container.body = body; container.halo = halo;
    this.players[p.sid] = container;
  }

  movePlayer(sid, x, y) {
    const c = this.players[sid];
    if (!c) return;
    this.tweens.add({ targets: c, x, y, duration: 250, ease: "Sine.easeOut" });
  }

  removePlayer(sid) {
    const c = this.players[sid];
    if (!c) return;
    this.tweens.add({
      targets: c, alpha: 0, duration: 200,
      onComplete: () => { c.destroy(); delete this.players[sid]; },
    });
  }

  showBubble(sid, text) {
    const c = this.players[sid];
    if (!c) return;
    const bubble = this.add.text(c.x, c.y - 50, text.slice(0, 80), {
      fontFamily: "ui-sans-serif", fontSize: "13px", color: "#0A0A0E",
      backgroundColor: "#F9FAFB", padding: { x: 6, y: 3 },
    }).setOrigin(0.5);
    this.tweens.add({
      targets: bubble, y: bubble.y - 25, alpha: 0, duration: 4000,
      onComplete: () => bubble.destroy(),
    });
  }

  update(_time, _delta) {
    const me = this.players[this.you.sid];
    if (!me || this.targetX === null) return;
    const dx = this.targetX - me.x;
    const dy = this.targetY - me.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) { this.targetX = this.targetY = null; return; }
    const step = Math.min(dist, 3.5);
    me.x += (dx / dist) * step;
    me.y += (dy / dist) * step;
    // Throttle emit to ~10/s
    const now = Date.now();
    if (now - this.lastEmit > 100) {
      this.socket.emit("move", { x: me.x, y: me.y });
      this.lastEmit = now;
    }
  }
}

export default function Nexus() {
  const { user } = useAuth();
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const socketRef = useRef(null);
  const [status, setStatus] = useState("connecting"); // connecting | online | error | offline
  const [room, setRoom] = useState(null);
  const [you, setYou] = useState(null);
  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);
  const [text, setText] = useState("");
  const [rooms, setRooms] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => { api.get("/nexus/rooms").then((r) => setRooms(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const BACKEND = process.env.REACT_APP_BACKEND_URL;
    const socket = io(BACKEND, {
      path: "/api/nexus/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setStatus("online"));
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", (e) => { setStatus("error"); toast.error("Connexion Nexus impossible"); });

    socket.on("room_joined", (payload) => {
      setRoom(payload.room); setYou(payload.you);
      setPlayers(payload.players); setChat(payload.chat_history || []);
      // (Re)initialize Phaser scene with new room
      if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; }
      const config = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: payload.room.width,
        height: payload.room.height,
        physics: { default: "arcade", arcade: { debug: false } },
        scene: NexusScene,
        backgroundColor: "#030305",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      };
      const game = new Phaser.Game(config);
      gameRef.current = game;
      game.scene.start("NexusScene", { socket, you: payload.you, room: payload.room });
      // Wait scene ready, then spawn all players
      game.events.once("ready", () => {
        const scene = game.scene.getScene("NexusScene");
        sceneRef.current = scene;
        payload.players.forEach((p) => scene.upsertPlayer(p));
      });
      setTimeout(() => {
        const scene = game.scene.getScene("NexusScene");
        sceneRef.current = scene;
        if (scene) payload.players.forEach((p) => scene.upsertPlayer(p));
      }, 200);
    });

    socket.on("player_join", (p) => {
      setPlayers((prev) => [...prev.filter((x) => x.sid !== p.sid), p]);
      sceneRef.current?.upsertPlayer(p);
    });
    socket.on("player_leave", ({ sid }) => {
      setPlayers((prev) => prev.filter((x) => x.sid !== sid));
      sceneRef.current?.removePlayer(sid);
    });
    socket.on("player_move", ({ sid, x, y }) => {
      sceneRef.current?.movePlayer(sid, x, y);
      setPlayers((prev) => prev.map((p) => p.sid === sid ? { ...p, x, y } : p));
    });
    socket.on("chat", (msg) => {
      setChat((prev) => [...prev.slice(-49), msg]);
      // bubble on the player avatar
      const sidEntry = playersRef.current.find((p) => p.user_id === msg.user_id);
      if (sidEntry) sceneRef.current?.showBubble(sidEntry.sid, msg.text);
    });
    socket.on("error_msg", ({ reason }) => toast.error(`Erreur Nexus : ${reason}`));

    return () => { socket.disconnect(); if (gameRef.current) gameRef.current.destroy(true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refs to read latest players inside socket callbacks
  const playersRef = useRef([]);
  useEffect(() => { playersRef.current = players; }, [players]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.emit("chat", { text: text.trim() });
    setText("");
  };
  const changeRoom = (rid) => socketRef.current?.emit("change_room", { room: rid });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative" data-testid="nexus-page">
      <StarField density={50} />
      <div className="text-center mb-6 relative">
        <div className="flex justify-center mb-3"><RuneSeal icon={Globe2} color="#00E5FF" size={48} /></div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300 font-bold mb-1">Monde social temps réel</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
          Nexus <span className="text-gradient">Online</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-2 italic max-w-2xl mx-auto">
          « Les héros se rencontrent ici, hors de toute quête. Cliquez pour vous déplacer, parlez librement. »
        </p>
        <RuneDivider className="mt-5 max-w-md mx-auto" />
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2" data-testid="nexus-status">
        <div className="text-[10px] uppercase tracking-[0.3em] font-bold flex items-center gap-2">
          {status === "online" ? <><Wifi className="w-3 h-3 text-green-400" /> <span className="text-green-400">Connecté</span></> :
            status === "connecting" ? <span className="text-yellow-400">Connexion en cours...</span> :
            <><WifiOff className="w-3 h-3 text-red-400" /> <span className="text-red-400">{status}</span></>}
          {room && <span className="text-cyan-300">· {room.name}</span>}
          <span className="text-zinc-500">· {players.length} héros</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {rooms.map((r) => (
            <button key={r.id} onClick={() => changeRoom(r.id)} data-testid={`room-${r.id}`}
              className={`px-3 py-1 rounded text-xs font-bold font-display border transition-all ${room?.id === r.id ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>
              {r.name} <span className="font-mono-stat opacity-60 text-[10px]">({r.online})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Phaser canvas */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-cyan-500/20 bg-[#030305]"
          style={{ aspectRatio: "12/7" }}
          data-testid="nexus-canvas-wrapper">
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Right panel: chat + players */}
        <aside className="flex flex-col gap-3" data-testid="nexus-side">
          <div className="glass rounded-xl p-3 flex-1 flex flex-col" style={{ minHeight: 420 }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Chat local</div>
            <div className="flex-1 overflow-y-auto space-y-1 mb-2 text-xs" data-testid="nexus-chat-log">
              {chat.length === 0 && <div className="text-zinc-500 italic text-center py-6">Aucun message — entamez la conversation</div>}
              {chat.map((m, i) => (
                <div key={i} className="leading-tight">
                  <span className={`font-display font-bold ${m.role === "admin" ? "text-yellow-300" : m.role === "moderator" ? "text-orange-300" : "text-cyan-300"}`}>
                    {m.role === "admin" && "👑 "}{m.role === "moderator" && "🛡️ "}{m.username}
                  </span>
                  <span className="text-zinc-400 text-[10px]"> · niv {m.level}</span>
                  <div className="text-zinc-200">{m.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={send} className="flex gap-1">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={280} placeholder="Parlez..."
                className="flex-1 bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs" data-testid="nexus-chat-input" />
              <button type="submit" disabled={!text.trim()}
                className="px-2 py-1.5 rounded border border-cyan-500/40 text-cyan-300 disabled:opacity-40" data-testid="nexus-chat-send">
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>

          <div className="glass rounded-xl p-3" data-testid="nexus-players">
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Présents ({players.length})
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
              {players.map((p) => (
                <div key={p.sid} className="flex items-center gap-2 py-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  <HeroName user={p} size="sm" />
                  <span className="text-[10px] text-zinc-500">· {p.class_name}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
