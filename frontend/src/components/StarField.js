import React, { useEffect, useRef } from "react";

// Animated star field + drifting nebula mist — full background ambiance
export default function StarField({ density = 100 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    let w = (c.width = c.offsetWidth);
    let h = (c.height = c.offsetHeight);
    const stars = Array.from({ length: density }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.3 + 0.2,
      tw: Math.random() * 0.04 + 0.01,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() > 0.85 ? 290 : Math.random() > 0.6 ? 195 : 220,
    }));
    let t = 0;
    let raf;
    const onResize = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; };
    window.addEventListener("resize", onResize);

    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const alpha = 0.3 + Math.sin(t * s.tw * 60 + s.phase) * 0.5;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${s.hue}, 80%, 70%, ${Math.max(0.05, alpha)})`;
        ctx.shadowColor = `hsla(${s.hue}, 80%, 70%, ${alpha})`;
        ctx.shadowBlur = 6;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [density]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <canvas ref={ref} className="absolute inset-0 w-full h-full" />
      {/* Drifting nebula mist */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[10%] left-[15%] w-[40vw] h-[40vw] bg-violet-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "11s", animationDelay: "2s" }} />
        <div className="absolute top-[40%] right-[30%] w-[25vw] h-[25vw] bg-fuchsia-500/8 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: "13s", animationDelay: "4s" }} />
      </div>
    </div>
  );
}
