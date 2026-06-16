import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { extractBanDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser, setBanInfo } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/login");
      return;
    }
    const sessionId = match[1];

    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id: sessionId });
        setUser(data);
        // Clean URL
        window.history.replaceState({}, document.title, "/feed");
        navigate("/feed", { state: { user: data } });
      } catch (err) {
        const ban = extractBanDetail(err);
        if (ban) {
          setBanInfo(ban);
          return;
        }
        console.error("Auth callback error", err);
        navigate("/login");
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-[#030305] flex items-center justify-center">
      <div className="text-center">
        <div className="font-display font-black text-3xl text-gradient mb-4 animate-pulse">NEXORIA</div>
        <div className="text-cyan-400 text-sm font-mono-stat">Établissement du lien dimensionnel...</div>
      </div>
    </div>
  );
}
