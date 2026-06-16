import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sword } from "lucide-react";
import SiteBackground from "@/components/SiteBackground";
import NexoriaCopyright from "@/components/NexoriaCopyright";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArcaneCircle } from "@/components/Ornaments";

/** Shared shell for Login / Register — esthétique grimoire médiéval. */
export default function AuthShell({ children, testid }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#080604]" data-testid={testid}>
      <SiteBackground variant="landing" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(120,80,30,0.12),transparent_55%),radial-gradient(ellipse_at_80%_90%,rgba(60,30,80,0.1),transparent_50%)] pointer-events-none" />
      <ArcaneCircle className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] opacity-20" color="#c9a565" />

      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-5 border-b border-amber-900/25">
        <Link to="/" className="flex items-center gap-2.5 group" data-testid="auth-logo">
          <img
            src="/logo.png"
            alt="NEXORIA"
            className="w-9 h-9 object-contain transition-transform group-hover:scale-105"
            style={{ filter: "drop-shadow(0 0 10px rgba(201,165,101,0.6))" }}
          />
          <span className="font-display font-black text-xl tracking-[0.18em] ancient-text">NEXORIA</span>
        </Link>
        <LanguageSwitcher compact />
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          {children}
        </motion.div>
      </div>

      <div className="relative z-10 flex justify-center pb-2 opacity-40">
        <Sword className="w-4 h-4 text-amber-600/60" />
      </div>
      <NexoriaCopyright compact className="relative z-10 pb-6" />
    </div>
  );
}
