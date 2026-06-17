import React from "react";

export default function MaintenanceTextField({
  value,
  onChange,
  label,
  hint,
  rows = 2,
  testid,
}) {
  return (
    <div className="space-y-1.5" data-testid={testid}>
      <label className="block text-[10px] uppercase tracking-[0.3em] text-zinc-200 font-bold">
        {label}
      </label>
      {hint && <p className="text-xs text-zinc-400 italic">{hint}</p>}
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-white/10 bg-[#0A0613] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-y min-h-[2.5rem]"
      />
    </div>
  );
}
