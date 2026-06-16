import React from "react";
import MaintenanceBrand from "@/components/maintenance/MaintenanceBrand";
import { resolveMaintenanceText } from "@/lib/maintenance-content";
import "@/pages/Maintenance.css";

const BG_URL = `${process.env.PUBLIC_URL || ""}/maintenance-bg.jpg`;

export default function MaintenancePreview({ html }) {
  const text = resolveMaintenanceText(html);

  return (
    <div className="rounded-xl border border-violet-500/25 overflow-hidden" data-testid="maintenance-preview">
      <div className="px-3 py-2 border-b border-white/10 bg-violet-500/10">
        <span className="text-[10px] uppercase tracking-[0.35em] text-violet-300 font-bold">Aperçu page maintenance</span>
      </div>
      <div className="relative min-h-[420px] text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${BG_URL})` }}
          aria-hidden
        />
        <div className="maintenance-bg-overlay absolute inset-0" aria-hidden />
        <div className="relative z-10 p-5 flex flex-col min-h-[420px]">
          <header className="maint-header mb-6">
            <MaintenanceBrand tagline={text.brand_tagline} />
            <div className="maint-status-pill">
              <span className="maint-status-dot" />
              <span className="maint-badge-text">{text.badge}</span>
            </div>
          </header>
          <div className="maint-hero mb-4">
            <h1 className="maint-hero-title text-2xl">
              {text.title_line1}
              {text.title_line2 && (
                <>
                  <br />
                  {text.title_line2}
                </>
              )}
            </h1>
            <p className="maint-hero-body text-sm">{text.body}</p>
            {text.body_sub && <p className="maint-hero-sub text-xs">{text.body_sub}</p>}
          </div>
          <div className="maint-panel max-w-xs">
            <h2 className="maint-panel-title">État des systèmes</h2>
            <p className="text-xs text-zinc-400 italic">Aperçu — avancement configurable dans l&apos;admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
