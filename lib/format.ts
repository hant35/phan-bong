export function formatCountdown(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return "Sắp đá"
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `${h}g ${m}p`
  return `${m}p nữa`
}

export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

export function formatDateTimeParts(date: Date | string): { time: string; date: string } {
  const d = typeof date === "string" ? new Date(date) : date
  // Build hours/minutes manually to avoid locale differences between server and client
  const hcm = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
  const h = hcm.getHours()
  const m = hcm.getMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  const time = `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`
  const weekday = WEEKDAYS[hcm.getDay()]
  const dd = hcm.getDate().toString().padStart(2, "0")
  const mm = (hcm.getMonth() + 1).toString().padStart(2, "0")
  const yyyy = hcm.getFullYear()
  return { time: `${time} ${weekday}`, date: `${dd}/${mm}/${yyyy}` }
}

export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "vừa xong"
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  const days = Math.floor(h / 24)
  return `${days} ngày trước`
}

export function flagUrl(code: string) {
  return `https://flagcdn.com/w160/${code}.png`
}

export const BET_TYPE_LABEL: Record<string, string> = {
  ah: "Kèo chấp",
  ou: "Tổng bàn thắng",
  exact: "Tỉ số",
  "1x2": "1X2",
}
