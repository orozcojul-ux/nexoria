// Simple synthesized SFX via WebAudio - no asset downloads
let ctx;
function getCtx() {
  if (!ctx) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) ctx = new Ctx();
    } catch {}
  }
  return ctx;
}

function tone(freq, duration = 0.1, type = "sine", volume = 0.05) {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = volume;
  o.connect(g);
  g.connect(c.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  o.stop(c.currentTime + duration);
}

export const sfx = {
  click: () => tone(880, 0.06, "triangle"),
  success: () => {
    tone(523, 0.08, "sine");
    setTimeout(() => tone(659, 0.08, "sine"), 70);
    setTimeout(() => tone(784, 0.12, "sine"), 140);
  },
  levelUp: () => {
    tone(440, 0.1, "sawtooth");
    setTimeout(() => tone(659, 0.1, "sawtooth"), 100);
    setTimeout(() => tone(880, 0.2, "sawtooth"), 200);
  },
  chest: () => {
    tone(220, 0.15, "square", 0.04);
    setTimeout(() => tone(440, 0.15, "sine"), 150);
    setTimeout(() => tone(880, 0.25, "sine"), 300);
  },
  oracle: () => {
    tone(330, 0.3, "sine", 0.03);
    setTimeout(() => tone(440, 0.3, "sine", 0.03), 100);
  },
  rift: () => {
    tone(110, 0.4, "sawtooth", 0.04);
    setTimeout(() => tone(880, 0.2, "sine"), 200);
  },
};
