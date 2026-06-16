// Simple synthesized SFX via WebAudio - no asset downloads
let ctx;
function getCtx() {
  if (!ctx) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) ctx = new Ctx();
    } catch (err) {
      console.warn("WebAudio not available", err?.message);
    }
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
  fanfare: () => {
    tone(392, 0.18, "sawtooth", 0.05);
    setTimeout(() => tone(523, 0.18, "sawtooth", 0.05), 180);
    setTimeout(() => tone(659, 0.18, "sawtooth", 0.05), 360);
    setTimeout(() => tone(784, 0.4,  "sawtooth", 0.06), 540);
    setTimeout(() => tone(659, 0.4,  "sawtooth", 0.04), 540);
  },
  horn: () => {
    tone(110, 0.5, "sawtooth", 0.06);
    setTimeout(() => tone(82,  0.6, "sawtooth", 0.05), 100);
    setTimeout(() => tone(110, 0.5, "sawtooth", 0.05), 400);
  },
  bell: () => {
    tone(440, 0.6, "sine", 0.05);
    setTimeout(() => tone(220, 0.6, "sine", 0.04), 50);
    setTimeout(() => tone(440, 0.6, "sine", 0.05), 700);
    setTimeout(() => tone(220, 0.6, "sine", 0.04), 750);
  },
  war: () => {
    tone(98, 0.35, "sawtooth", 0.07);
    setTimeout(() => tone(147, 0.25, "square", 0.05), 120);
    setTimeout(() => tone(98, 0.4, "sawtooth", 0.06), 280);
    setTimeout(() => tone(196, 0.5, "sawtooth", 0.05), 450);
    setTimeout(() => tone(98, 0.6, "sawtooth", 0.04), 650);
  },
  trumpet: () => {
    tone(523, 0.15, "square", 0.04);
    setTimeout(() => tone(659, 0.15, "square", 0.04), 150);
    setTimeout(() => tone(784, 0.15, "square", 0.04), 300);
    setTimeout(() => tone(1047, 0.35, "square", 0.05), 450);
  },
  chime: () => {
    tone(880, 0.25, "sine", 0.04);
    setTimeout(() => tone(1175, 0.25, "sine", 0.035), 80);
    setTimeout(() => tone(1319, 0.35, "sine", 0.03), 160);
  },
  drum: () => {
    tone(80, 0.12, "square", 0.08);
    setTimeout(() => tone(60, 0.15, "square", 0.07), 200);
    setTimeout(() => tone(80, 0.12, "square", 0.08), 400);
    setTimeout(() => tone(60, 0.2, "square", 0.06), 550);
  },
  ding: () => {
    tone(1047, 0.2, "sine", 0.05);
    setTimeout(() => tone(1319, 0.25, "sine", 0.04), 100);
  },
};
