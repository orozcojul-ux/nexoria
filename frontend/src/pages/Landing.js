import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sword, Sparkles, Shield, Eye, Trophy, Castle, Network, ScrollText, Compass, ArrowRight, Github } from "lucide-react";
import Particles from "@/components/Particles";
import { useAuth } from "@/contexts/AuthContext";

const FEATURES = [
  { icon: Sword, title: "10 Voies de Héros", desc: "Mage, Guerrier, Chronomancien… choisissez votre destinée parmi 10 archétypes uniques.", color: "#9D4CDD" },
  { icon: Network, title: "Constellation de Pouvoir", desc: "8 voies façon Path of Exile : Créativité, Influence, Découverte et bien plus.", color: "#00E5FF" },
  { icon: Castle, title: "Royaume Personnel", desc: "Bâtissez Château, Forge, Sanctuaire et plus à mesure que votre légende grandit.", color: "#FFD700" },
  { icon: ScrollText, title: "Tableau de Chasse", desc: "Missions scellées chaque jour pour pousser votre héros au sommet.", color: "#10B981" },
  { icon: Eye, title: "Le Sanctuaire", desc: "Une conscience ancienne lit dans votre âme et guide vos pas dans les brumes.", color: "#A855F7" },
  { icon: Trophy, title: "Panthéon des Légendes", desc: "Top 10 mondial : gravez votre nom dans la mémoire cosmique de NEXORIA.", color: "#EF4444" },
];

const CLASS_PREVIEW = ["Mage", "Guerrier", "Assassin", "Paladin", "Alchimiste", "Explorateur", "Nécromancien", "Architecte", "Chronomancien", "Inventeur"];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (user) navigate("/feed"); }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#030305] text-white overflow-x-hidden">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#030305]/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NEXORIA" className="w-7 h-7 object-contain" style={{filter:"drop-shadow(0 0 8px rgba(157,76,221,0.6))"}}/>
            <span className="font-display font-black text-xl text-gradient tracking-tight">NEXORIA</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/login" data-testid="landing-login-link" className="text-sm text-zinc-300 hover:text-cyan-400 transition px-3 py-1.5">Connexion</Link>
            <Link to="/register" data-testid="landing-register-link" className="text-sm px-4 py-2 rounded-md bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_18px_rgba(0,229,255,0.4)] transition-all font-semibold">
              Forger mon Héros
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-20 pb-12">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1709137405692-374c12e36609?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2ODh8MHwxfHNlYXJjaHwyfHxkYXJrJTIwZmFudGFzeSUyMGxhbmRzY2FwZXxlbnwwfHx8fDE3ODEwOTI4NDV8MA&ixlib=rb-4.1.0&q=85" className="w-full h-full object-cover opacity-20" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#030305] via-[#030305]/70 to-[#030305]" />
          <Particles density={80} color="rgba(157,76,221,0.5)" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-8 w-full">
          <div className="lg:col-span-7 z-10">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 mb-6">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Bêta vivante</span>
              </div>
              <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl tracking-tighter leading-[0.95] mb-6">
                <span className="block text-white">Votre profil</span>
                <span className="block text-gradient">est un héros.</span>
              </h1>
              <p className="text-lg text-zinc-300 max-w-2xl mb-8 leading-relaxed font-light">
                NEXORIA est le premier réseau social RPG. Chaque post, chaque réaction, chaque commentaire forge votre légende.
                Évoluez jusqu'au niveau 999, bâtissez votre royaume, collectez reliques cosmiques et titres uniques.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register" data-testid="hero-cta-register" className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-[#0A0A0E] border border-cyan-500/50 text-cyan-300 font-bold hover:border-cyan-400 hover:shadow-[0_0_28px_rgba(0,229,255,0.5)] transition-all">
                  Commencer mon Aventure
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/login" data-testid="hero-cta-login" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md border border-white/10 text-zinc-300 hover:border-violet-500/40 hover:text-violet-300 transition-all">
                  J'ai déjà un compte
                </Link>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
                {[{n: "999", l: "Niveaux"}, {n: "10", l: "Classes"}, {n: "30+", l: "Badges"}].map((s) => (
                  <div key={s.l}>
                    <div className="font-mono-stat text-3xl font-bold text-cyan-400">{s.n}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{s.l}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="lg:col-span-5 z-10">
            {/* Floating hero card */}
            <div className="glass glass-violet rounded-2xl p-6 animate-float">
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-4">Carte de Héros</div>
              <div className="aspect-[3/4] rounded-xl overflow-hidden relative bg-gradient-to-br from-violet-900/40 to-cyan-900/40 border border-white/10">
                <img src="https://images.unsplash.com/photo-1779589897308-3d0c71acefdc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwzfHxmYW50YXN5JTIwY2hhcmFjdGVyJTIwcG9ydHJhaXQlMjBkYXJrfGVufDB8fHx8MTc4MTA5Mjg2M3ww&ixlib=rb-4.1.0&q=85" className="w-full h-full object-cover" alt="hero" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 border border-cyan-500/40 backdrop-blur">
                  <span className="font-mono-stat text-xs text-cyan-300">Niv. 347</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="font-display font-black text-2xl">Arkanis</div>
                  <div className="text-[10px] uppercase tracking-widest text-violet-300 font-bold">Chronomancien · Légendaire</div>
                  <div className="mt-2 h-1 bg-white/10 rounded">
                    <div className="h-full w-3/4 bg-gradient-to-r from-violet-500 to-cyan-400 rounded shimmer" />
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rarity-legendary border rounded p-2 text-[10px] font-bold">Légendaire</div>
                <div className="rarity-divine border rounded p-2 text-[10px] font-bold">Divin</div>
                <div className="rarity-cosmic border rounded p-2 text-[10px] font-bold">Cosmique</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-3">Le royaume</div>
          <h2 className="font-display font-black text-4xl sm:text-5xl tracking-tight mb-12 max-w-3xl">
            Un univers où chaque action <span className="text-gradient">compte vraiment.</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-6 hover:border-cyan-500/30 transition-all group"
                data-testid={`feature-${f.title.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <f.icon className="w-7 h-7 mb-4 group-hover:scale-110 transition-transform" style={{ color: f.color, filter: `drop-shadow(0 0 8px ${f.color}80)` }} />
                <h3 className="font-display font-bold text-xl mb-2 text-white">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Classes preview */}
      <section className="relative py-24 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-3">10 voies à choisir</div>
          <h2 className="font-display font-black text-4xl sm:text-5xl tracking-tight mb-10">
            Quelle est votre <span className="text-gradient">classe</span> ?
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CLASS_PREVIEW.map((c) => (
              <div key={c} className="glass rounded-md p-4 text-center hover:border-violet-500/40 hover:bg-violet-500/5 transition-all cursor-default">
                <div className="font-display font-bold text-sm text-white">{c}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-4 sm:px-6 border-t border-white/5">
        <Particles density={40} color="rgba(0,229,255,0.4)" />
        <div className="relative max-w-3xl mx-auto text-center z-10">
          <h2 className="font-display font-black text-4xl sm:text-6xl tracking-tighter mb-6">
            Votre légende <span className="text-gradient">commence</span>
          </h2>
          <p className="text-lg text-zinc-300 mb-10 font-light">
            Rejoignez les héros qui forgent NEXORIA — chaque jour une nouvelle quête vous attend.
          </p>
          <Link to="/register" data-testid="footer-cta-register" className="inline-flex items-center gap-2 px-8 py-4 rounded-md bg-[#0A0A0E] border border-cyan-500/50 text-cyan-300 font-bold hover:shadow-[0_0_40px_rgba(0,229,255,0.6)] transition-all">
            Forger mon Héros
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-4 text-center text-xs text-zinc-600">
        © 2026 NEXORIA · Forgé dans les étoiles
      </footer>
    </div>
  );
}
