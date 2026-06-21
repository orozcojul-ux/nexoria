import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogIn, LogOut } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import HeroName from "@/components/HeroName";
import "./FriendPresenceBubbles.css";

const DISMISS_MS = 4500;
const POLL_MS = 40000;
const DEDUPE_MS = 3500;
const MAX_BUBBLES = 4;

function Bubble({ item, onDismiss }) {
  const online = item.online;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 48, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 32, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className={`friend-presence-bubble ${online ? "friend-presence-bubble--on" : "friend-presence-bubble--off"}`}
      role="status"
      data-testid={`friend-presence-${item.user_id}-${online ? "on" : "off"}`}
    >
      <div className="friend-presence-bubble-icon" aria-hidden>
        {online ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
      </div>
      <div className="friend-presence-bubble-body">
        <HeroName user={item} size="sm" showIcon={false} />
        <span className="friend-presence-bubble-msg">
          {online ? "s'est connecté" : "s'est déconnecté"}
        </span>
      </div>
      <button
        type="button"
        className="friend-presence-bubble-close"
        onClick={() => onDismiss(item.id)}
        aria-label="Fermer"
      >
        ×
      </button>
      <motion.div
        className="friend-presence-bubble-timer"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: DISMISS_MS / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}

export default function FriendPresenceBubbles() {
  const { user } = useAuth();
  const [bubbles, setBubbles] = useState([]);
  const onlineMapRef = useRef(null);
  const seededRef = useRef(false);
  const dedupeRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const pushAlert = useCallback((friend, online) => {
    if (!user?.user_id || friend.user_id === user.user_id) return;

    const dedupeKey = `${friend.user_id}-${online}`;
    const now = Date.now();
    const last = dedupeRef.current.get(dedupeKey) || 0;
    if (now - last < DEDUPE_MS) return;
    dedupeRef.current.set(dedupeKey, now);

    const id = `${dedupeKey}-${now}`;
    setBubbles((prev) => [...prev.slice(-(MAX_BUBBLES - 1)), { ...friend, online, id }]);
    window.setTimeout(() => dismiss(id), DISMISS_MS);
  }, [dismiss, user?.user_id]);

  const applySnapshot = useCallback((friends) => {
    const next = new Map();
    for (const f of friends) {
      if (f?.user_id) next.set(f.user_id, !!f.online);
    }

    if (!seededRef.current) {
      onlineMapRef.current = next;
      seededRef.current = true;
      return;
    }

    const prev = onlineMapRef.current || new Map();
    for (const [uid, isOnline] of next) {
      const was = prev.get(uid);
      if (was === undefined || was === isOnline) continue;
      const friend = friends.find((f) => f.user_id === uid);
      if (friend) pushAlert(friend, isOnline);
    }
    onlineMapRef.current = next;
  }, [pushAlert]);

  useEffect(() => {
    if (!user?.user_id) {
      seededRef.current = false;
      onlineMapRef.current = null;
      setBubbles([]);
      return undefined;
    }

    const poll = () => {
      if (document.visibilityState === "hidden") return;
      api.get("/friends")
        .then((r) => applySnapshot(r.data || []))
        .catch(() => {});
    };

    poll();
    const id = window.setInterval(poll, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.user_id, applySnapshot]);

  useEffect(() => {
    const onPresence = (e) => {
      const p = e.detail;
      if (!p?.user_id) return;
      pushAlert(p, !!p.online);
      const prev = onlineMapRef.current || new Map();
      prev.set(p.user_id, !!p.online);
      onlineMapRef.current = prev;
    };
    window.addEventListener("nexoria:friend-presence", onPresence);
    return () => window.removeEventListener("nexoria:friend-presence", onPresence);
  }, [pushAlert]);

  if (!user?.user_id) return null;

  return (
    <div className="friend-presence-stack" aria-live="polite" data-testid="friend-presence-stack">
      <AnimatePresence mode="popLayout">
        {bubbles.map((b) => (
          <Bubble key={b.id} item={b} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
