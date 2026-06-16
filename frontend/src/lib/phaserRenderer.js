/** Detect whether WebGL can be acquired in this browser (Electron, VM, old GPU, etc.). */
export function isWebGLAvailable() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: false });
    if (!gl || gl.isContextLost?.()) return false;
    return true;
  } catch {
    return false;
  }
}

/** Electron / webviews IDE often fail Phaser WebGL init even when a probe context works. */
export function shouldPreferCanvas() {
  if (!isWebGLAvailable()) return true;
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent || "";
    if (/Electron/i.test(ua)) return true;
  }
  return false;
}

/**
 * Boot Phaser with WebGL when possible, otherwise Canvas — avoids hard crash
 * "WebGL unsupported" in restricted environments.
 */
export function createPhaserGame(Phaser, baseConfig, { forceCanvas = false } = {}) {
  const candidates = forceCanvas || shouldPreferCanvas()
    ? [Phaser.CANVAS]
    : [Phaser.WEBGL, Phaser.CANVAS];

  let lastError;
  for (const type of candidates) {
    try {
      return new Phaser.Game({ ...baseConfig, type });
    } catch (err) {
      lastError = err;
      console.warn(`[Nexus] Phaser renderer type=${type} failed:`, err?.message || err);
    }
  }
  throw lastError || new Error("Aucun moteur graphique Phaser disponible");
}

export function phaserRendererLabel(Phaser, game) {
  const t = game?.config?.renderType;
  if (t === Phaser.WEBGL) return "WebGL";
  if (t === Phaser.CANVAS) return "Canvas";
  return "auto";
}
