import React, { useEffect, useState } from "react";
import PwaInstallTutorialModal from "@/components/PwaInstallTutorialModal";

/** Global PWA tutorial popup — opened via `nexoria:open-pwa-tutorial` custom event. */
export default function PwaTutorialHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("nexoria:open-pwa-tutorial", onOpen);
    return () => window.removeEventListener("nexoria:open-pwa-tutorial", onOpen);
  }, []);

  return <PwaInstallTutorialModal open={open} onClose={() => setOpen(false)} />;
}

export function openPwaTutorial() {
  window.dispatchEvent(new CustomEvent("nexoria:open-pwa-tutorial"));
}
