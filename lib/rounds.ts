// Thứ tự các vòng đấu trong giải, dùng để xác định vòng hiện tại và sắp xếp hiển thị
export const ROUND_ORDER = ["Vòng bảng", "Vòng 32", "Vòng 16", "Tứ kết", "Bán kết", "Chung kết"] as const

// Match.stage có thể là "Vòng bảng · Bảng A" (seed) hoặc thẳng "Tứ kết" (sync/admin) — quy về tên vòng chuẩn
export function canonicalRound(stage: string): string {
  return stage.split(" · ")[0]?.trim() ?? stage
}
