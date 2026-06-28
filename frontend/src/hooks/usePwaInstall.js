import { useCallback, useEffect, useState } from "react";
import {
  canShowInstallUi,
  isAndroidChrome,
  isIosSafari,
  isMobileDevice,
  isStandaloneMode,
} from "@/lib/pwa";

/** Capture beforeinstallprompt and expose install helpers. */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandaloneMode);
  const [visible, setVisible] = useState(canShowInstallUi);

  useEffect(() => {
    const onInstallReady = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setVisible(false);
    };
    const onDisplayMode = () => setInstalled(isStandaloneMode());

    window.addEventListener("beforeinstallprompt", onInstallReady);
    window.addEventListener("appinstalled", onInstalled);
    window.matchMedia("(display-mode: standalone)").addEventListener("change", onDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallReady);
      window.removeEventListener("appinstalled", onInstalled);
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", onDisplayMode);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setInstalled(true);
      setVisible(false);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const showAndroidInstall = Boolean(deferredPrompt) && isAndroidChrome();
  const showIosHelp = isIosSafari() && !installed;
  const showGenericMobile = visible && !installed && !showAndroidInstall && !showIosHelp && isMobileDevice();

  return {
    visible: visible && !installed && (showAndroidInstall || showIosHelp || showGenericMobile),
    showAndroidInstall,
    showIosHelp,
    install,
    installed,
  };
}
