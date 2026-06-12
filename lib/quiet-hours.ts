import { prisma } from "@/lib/db"

const TZ = "Asia/Ho_Chi_Minh"
const QUIET_START_HOUR = 23
const QUIET_END_HOUR = 8

function vietnamHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: TZ,
    }).format(date),
  )
}

export function isQuietHoursNow(now = new Date()): boolean {
  const hour = vietnamHour(now)
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR
}

/** Push có được gửi ngay không (inbox vẫn ghi). Mặc định bật quiet hours 23h–8h giờ VN. */
export async function shouldSendPushNow(userId: string, now = new Date()): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { quietHoursEnabled: true },
  })
  if (user?.quietHoursEnabled === false) return true
  return !isQuietHoursNow(now)
}
