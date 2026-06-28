/** PWA install detection and beforeinstallprompt handling. */

export function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: fullscreen)").matches
    || window.navigator.standalone === true
  );
}

export function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua);
  return isIOS && isSafari;
}

export function isAndroidChrome() {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent);
}

export function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 768px)").matches
    || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

/** @returns {boolean} Whether install prompt UI may be shown */
export function canShowInstallUi() {
  return isMobileDevice() && !isStandaloneMode();
}
