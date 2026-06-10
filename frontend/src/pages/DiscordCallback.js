import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function DiscordCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const code = params.get("code");
    if (!code) { navigate("/login"); return; }
    (async () => {
      try {
        const { data } = await api.post("/auth/discord/exchange", { code });
        setUser(data);
        toast.success(`Bienvenue ${data.username}`);
        navigate("/feed");
      } catch (err) {
        toast.error(err.response?.data?.detail || "Discord OAuth a échoué");
        navigate("/login");
      }
    })();
  }, [params, navigate, setUser]);

  return (
    <div className="min-h-screen bg-[#030305] flex items-center justify-center text-cyan-400 font-mono-stat animate-pulse">
      Établissement du lien Discord...
    </div>
  );
}
