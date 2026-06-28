import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { openPwaTutorial } from "@/components/PwaTutorialHost";

/** Legacy URL — opens the tutorial popup and returns to the home feed. */
export default function MobileAppRedirect() {
  useEffect(() => {
    openPwaTutorial();
  }, []);

  return <Navigate to="/" replace />;
}
