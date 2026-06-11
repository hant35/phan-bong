"use client"

import { hopeStarHint, hopeStarLabel } from "@/lib/hope-star"

export function HopeStarPicker({
  value,
  onChange,
  compact = false,
}: {
  value: number
  onChange: (star: number) => void
  compact?: boolean
}) {
  const star = Math.max(1, Math.min(5, value))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-white/30 uppercase tracking-wide">Ngôi sao hi vọng</label>
        <span className="text-[10px] text-white/50">{hopeStarHint(star)}</span>
      </div>
      <div className="flex mb-2" style={{ gap: compact ? 6 : 8 }}>
        {([1, 2, 3, 4, 5] as const).map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`flex-1 rounded-xl font-black transition-all ${compact ? "py-1.5 text-xs" : "py-2 text-sm"}`}
            style={star === c
              ? { background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {c}
          </button>
        ))}
      </div>
      <p className={`text-center text-white/50 ${compact ? "text-[10px]" : "text-xs"}`}>{hopeStarLabel(star)}</p>
    </div>
  )
}
