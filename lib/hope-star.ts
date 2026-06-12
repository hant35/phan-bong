// ══════════════════════════════════════════════════════════════
// Ngôi sao hi vọng — thưởng/phạt xu theo mức mạo hiểm
// ══════════════════════════════════════════════════════════════

export const DEFAULT_HOPE_STAR = 1

/** Xu bị trừ khi bỏ trận không dự đoán */
export const SKIP_PENALTY = 5

/** index 1..5 → xu thưởng khi thắng */
export const HOPE_STAR_WIN = [0, 1, 2, 3, 4, 5] as const

/** index 1..5 → xu trừ khi thua (0 = không trừ) */
export const HOPE_STAR_LOSS = [0, 0, 1, 2, 4, 4] as const

export type HopeStar = 1 | 2 | 3 | 4 | 5

export function clampHopeStar(star: number): HopeStar {
  return Math.max(1, Math.min(5, Math.round(star))) as HopeStar
}

export function hopeStarDelta(star: number, result: "win" | "loss"): number {
  const s = clampHopeStar(star)
  return result === "win" ? HOPE_STAR_WIN[s] : -HOPE_STAR_LOSS[s]
}

export function hopeStarHint(star: number): string {
  const s = clampHopeStar(star)
  const win = HOPE_STAR_WIN[s]
  const loss = HOPE_STAR_LOSS[s]
  if (loss === 0) return `Thắng: +${win} xu · Thua: 0`
  return `Thắng: +${win} xu · Thua: −${loss} xu`
}

export function hopeStarLabel(star: number): string {
  const labels: Record<HopeStar, string> = {
    1: "An toàn ⭐",
    2: "Cẩn trọng ⭐⭐",
    3: "Cân bằng ⭐⭐⭐",
    4: "Mạo hiểm ⭐⭐⭐⭐",
    5: "All-in ⭐⭐⭐⭐⭐",
  }
  return labels[clampHopeStar(star)]
}

export function clampPoints(balance: number, delta: number): number {
  return Math.max(0, balance + delta)
}
