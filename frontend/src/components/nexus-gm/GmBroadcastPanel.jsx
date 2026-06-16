import React from "react";
import { Megaphone, Bell } from "lucide-react";

export default function GmBroadcastPanel({
  announceText, setAnnounceText, submitAnnounce,
  popupTitle, setPopupTitle, popupBody, setPopupBody, submitPopup,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="nexus-gm-section nexus-gm-section--gold">
        <div className="nexus-gm-section-head">
          <Megaphone className="w-3.5 h-3.5 text-amber-300" />
          <span className="nexus-gm-section-title">Décret global</span>
        </div>
        <div className="nexus-gm-section-body">
          <form onSubmit={submitAnnounce} className="space-y-2">
            <textarea
              value={announceText}
              onChange={(e) => setAnnounceText(e.target.value)}
              maxLength={240}
              rows={4}
              placeholder="Diffusé en bannière à toutes les salles…"
              className="nexus-gm-textarea"
              data-testid="gm-announce-input"
            />
            <button
              type="submit"
              disabled={!announceText.trim()}
              className="nexus-gm-btn nexus-gm-btn--gold w-full disabled:opacity-40"
              data-testid="gm-announce-submit"
            >
              Proclamer le décret
            </button>
          </form>
        </div>
      </div>

      <div className="nexus-gm-section nexus-gm-section--violet">
        <div className="nexus-gm-section-head">
          <Bell className="w-3.5 h-3.5 text-violet-300" />
          <span className="nexus-gm-section-title">Notification popup</span>
        </div>
        <div className="nexus-gm-section-body">
          <form onSubmit={submitPopup} className="space-y-2">
            <input
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
              maxLength={80}
              placeholder="Titre du décret"
              className="nexus-gm-input"
              data-testid="gm-popup-title"
            />
            <textarea
              value={popupBody}
              onChange={(e) => setPopupBody(e.target.value)}
              maxLength={400}
              rows={3}
              placeholder="Message affiché chez tous les héros"
              className="nexus-gm-textarea"
              data-testid="gm-popup-body"
            />
            <button
              type="submit"
              disabled={!popupBody.trim()}
              className="nexus-gm-btn nexus-gm-btn--violet w-full disabled:opacity-40"
              data-testid="gm-popup-submit"
            >
              Envoyer en popup
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
