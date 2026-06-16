import React from "react";
import { Globe2, WifiOff, Eye, Lock } from "lucide-react";
import { NexoriaLogoMark } from "@/components/maintenance/NexoriaLogoMark";
import { resolveOnlineClosedText } from "@/lib/online-gate-content";

const DISCORD_URL = process.env.REACT_APP_DISCORD_URL || "https://discord.gg/RC5QjcWDCH";

export function NexusBootLoading() {
  return (
    <div className="nexus-boot" data-testid="nexus-loading">
      <div className="nexus-boot-card">
        <div className="nexus-boot-portal mx-auto mb-4 flex items-center justify-center">
          <NexoriaLogoMark size={36} />
        </div>
        <h2 className="nexus-boot-title">Ouverture du portail</h2>
        <p className="nexus-boot-sub">Les Sentinelles synchronisent le monde isométrique du Nexus…</p>
        <div className="w-10 h-10 mx-auto rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
      </div>
    </div>
  );
}

export function NexusBootError({ onRetry }) {
  return (
    <div className="nexus-boot" data-testid="nexus-error">
      <div className="nexus-boot-card">
        <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="nexus-boot-title">Portail fermé</h2>
        <p className="nexus-boot-sub">
          Le royaume temps réel ne répond pas. Vérifiez que MongoDB et le backend FastAPI tournent sur le port 8000.
        </p>
        <button type="button" onClick={onRetry} className="nexus-boot-btn" data-testid="nexus-retry-btn">
          Réouvrir le portail
        </button>
      </div>
    </div>
  );
}

export function NexusBootRenderError({ message, onRetry }) {
  return (
    <div className="nexus-boot" data-testid="nexus-render-error">
      <div className="nexus-boot-card">
        <Eye className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="nexus-boot-title">Rendu indisponible</h2>
        <p className="nexus-boot-sub">
          WebGL n&apos;est pas disponible. Le Nexus peut basculer en mode Canvas — réessayez ou utilisez Chrome/Edge.
        </p>
        {message && <p className="text-xs text-zinc-500 font-mono mb-4">{message}</p>}
        <button type="button" onClick={onRetry} className="nexus-boot-btn" data-testid="nexus-render-retry-btn">
          Mode Canvas
        </button>
      </div>
    </div>
  );
}

export function NexusBootWaiting() {
  return (
    <div className="nexus-boot" data-testid="nexus-waiting">
      <div className="nexus-boot-card">
        <Globe2 className="w-10 h-10 text-violet-300 mx-auto mb-3 animate-pulse" />
        <p className="nexus-boot-sub mb-0">En attente des données du royaume…</p>
      </div>
    </div>
  );
}

export function NexusBootClosed({ html, onClose }) {
  const text = resolveOnlineClosedText(html);
  return (
    <div className="nexus-boot" data-testid="nexus-closed">
      <div className="nexus-boot-card max-w-lg">
        <Lock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/80 mb-2">{text.badge}</p>
        <h2 className="nexus-boot-title">
          {text.title_line1}
          {text.title_line2 ? (
            <>
              <br />
              {text.title_line2}
            </>
          ) : null}
        </h2>
        <p className="nexus-boot-sub">{text.body}</p>
        {text.body_sub && <p className="text-xs text-zinc-500 mt-2">{text.body_sub}</p>}
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="nexus-boot-btn inline-flex items-center justify-center gap-2 mt-4"
          data-testid="nexus-closed-discord-btn"
        >
          {text.discord_label}
        </a>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300 mt-4 block mx-auto">
            Retour au site
          </button>
        )}
      </div>
    </div>
  );
}
