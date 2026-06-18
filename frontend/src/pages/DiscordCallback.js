import React, { useEffect, useRef } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import { toast } from "sonner";

import api, { formatApiError, extractBanDetail } from "@/lib/api";

import { useAuth } from "@/contexts/AuthContext";

import { useI18n } from "@/contexts/I18nContext";



export default function DiscordCallback() {

  const [params] = useSearchParams();

  const navigate = useNavigate();

  const { setUser, setBanInfo } = useAuth();

  const { t } = useI18n();

  const done = useRef(false);



  useEffect(() => {

    if (done.current) return;

    done.current = true;



    const oauthError = params.get("error");

    if (oauthError) {

      toast.error(t("discord.callback.denied"));

      navigate("/login");

      return;

    }



    const code = params.get("code");

    if (!code) {

      toast.error(t("discord.callback.missing_code"));

      navigate("/login");

      return;

    }

    // If this callback was opened as a popup by the maintenance staff gate,
    // send the code back to the parent window and close immediately.
    if (window.opener && window.name === "discord_oauth") {

      window.opener.postMessage({ type: "discord_oauth_code", code }, window.location.origin);

      window.close();

      return;

    }



    (async () => {

      try {

        let referralCode = null;

        try { referralCode = localStorage.getItem("nexoria_ref"); } catch {}

        const { data } = await api.post("/auth/discord/exchange", { code, referral_code: referralCode || undefined });

        try { localStorage.removeItem("nexoria_ref"); } catch {}

        setUser(data);

        const meta = data.auth_meta || {};



        if (meta.is_new_account) {

          toast.success(t("discord.callback.welcome_new", { name: data.username }));

          if (meta.xp_bonus > 0) {

            toast.success(t("discord.callback.xp_bonus", { amount: meta.xp_bonus }), { duration: 5000 });

          }

          if (meta.badge_granted) {

            toast.success(t("discord.callback.badge_unlocked"), { duration: 6000 });

          }

        } else if (meta.discord_linked) {

          toast.success(t("discord.callback.linked"));

        } else {

          toast.success(t("discord.callback.welcome_back", { name: data.username }));

        }



        if (meta.email_provisional) {

          toast.warning(

            "Aucune adresse e-mail valide n'a été récupérée via Discord. Vous DEVEZ la remplacer par une adresse e-mail valide dans Réglages › Email (indispensable pour sécuriser et récupérer votre compte).",

            { duration: 14000 },

          );

          navigate("/settings");

          return;

        }



        navigate("/feed");

      } catch (err) {

        const ban = extractBanDetail(err);

        if (ban) {

          setBanInfo(ban);

          return;

        }

        toast.error(formatApiError(err) || t("discord.callback.failed"));

        navigate("/login");

      }

    })();

  }, [params, navigate, setUser, setBanInfo, t]);



  return (

    <div className="min-h-screen bg-[#030305] flex flex-col items-center justify-center text-cyan-400 font-mono-stat gap-3">

      <div className="w-10 h-10 rounded-full border-2 border-[#5865F2]/60 border-t-[#5865F2] animate-spin" />

      <p className="animate-pulse text-sm">{t("discord.callback.loading")}</p>

    </div>

  );

}

