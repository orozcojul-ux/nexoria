import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Trash2, VolumeX, Volume2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import HeroName from "@/components/HeroName";

const MUTE_PRESETS = [
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "1 h", minutes: 60 },
];

export default function GmChatModeration({ room, gm, players = [], rooms = [] }) {
  const [roomFilter, setRoomFilter] = useState(room?.id || "place_centrale");
  const [userFilter, setUserFilter] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const roomOptions = useMemo(() => {
    if (rooms.length > 0) {
      return rooms.map((r) => ({
        id: r.id,
        label: `${r.icon ? `${r.icon} ` : ""}${r.name || r.id}`,
      }));
    }
    if (room?.id) {
      return [{ id: room.id, label: room.name || room.id }];
    }
    return [{ id: "place_centrale", label: "Place Centrale" }];
  }, [rooms, room?.id, room?.name]);

  const loadMessages = useCallback(async () => {
    if (!roomFilter) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/nexus/rooms/${roomFilter}/messages`);
      setMessages(data.messages || []);
    } catch {
      toast.error("Impossible de charger le tchat.");
    } finally {
      setLoading(false);
    }
  }, [roomFilter]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (room?.id) setRoomFilter(room.id);
  }, [room?.id]);

  const filtered = messages.filter((m) => {
    if (!userFilter.trim()) return true;
    const q = userFilter.trim().toLowerCase();
    return (m.username || "").toLowerCase().includes(q) || (m.user_id || "").includes(q);
  });

  const deleteMessage = (messageId) => {
    if (!gm?.deleteRoomChatMessage) return;
    gm.deleteRoomChatMessage(messageId);
    setMessages((prev) => prev.filter((m) => m.message_id !== messageId));
    toast.success("Message supprimé.");
  };

  const muteUser = (userId, minutes) => {
    if (!gm?.muteRoomChatUser) return;
    gm.muteRoomChatUser(userId, minutes);
    toast.success(`Joueur réduit au silence (${minutes} min).`);
  };

  const unmuteUser = (userId) => {
    if (!gm?.unmuteRoomChatUser) return;
    gm.unmuteRoomChatUser(userId);
    toast.success("Joueur autorisé à parler.");
  };

  return (
    <div className="nexus-gm-section">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-cyan-300" />
        <h3 className="nexus-gm-section-title">Tchat &amp; Modération</h3>
        <button type="button" onClick={loadMessages} className="nexus-icon-btn ml-auto" title="Actualiser">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <label className="text-[10px] text-zinc-400">
          Historique salle
          <select
            className="nexus-gm-select mt-1 w-full"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
          >
            {roomOptions.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        <label className="text-[10px] text-zinc-400">
          Filtrer joueur
          <input
            className="nexus-gm-input mt-1 w-full"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            placeholder="Pseudo…"
          />
        </label>
      </div>

      <div className="nexus-gm-chat-log max-h-48 overflow-y-auto mb-3 space-y-2">
        {filtered.length === 0 && (
          <p className="text-zinc-500 text-xs italic text-center py-4">Aucun message récent.</p>
        )}
        {filtered.slice(-50).reverse().map((m) => (
          <div key={m.message_id} className="nexus-gm-chat-row text-xs border border-white/5 rounded p-2">
            <div className="flex items-center gap-2 flex-wrap">
              <HeroName user={{ username: m.username, role: m.role, level: m.level }} size="xs" showIcon={false} />
              <span className="text-zinc-600">{m.room_id}</span>
              <div className="ml-auto flex gap-1">
                {MUTE_PRESETS.map((p) => (
                  <button
                    key={p.minutes}
                    type="button"
                    className="nexus-gm-mini-btn"
                    title={`Mute ${p.label}`}
                    onClick={() => muteUser(m.user_id, p.minutes)}
                  >
                    <VolumeX className="w-2.5 h-2.5" /> {p.label}
                  </button>
                ))}
                <button type="button" className="nexus-gm-mini-btn" onClick={() => unmuteUser(m.user_id)} title="Unmute">
                  <Volume2 className="w-2.5 h-2.5" />
                </button>
                {m.message_id && !String(m.message_id).startsWith("legacy_") && (
                  <button type="button" className="nexus-gm-mini-btn text-red-300" onClick={() => deleteMessage(m.message_id)}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-zinc-300 mt-1 break-words normal-case">{m.content}</p>
          </div>
        ))}
      </div>

      {players.length > 0 && (
        <div className="text-[10px] text-zinc-500">
          Joueurs présents : {players.map((p) => p.username).join(", ")}
        </div>
      )}
    </div>
  );
}
