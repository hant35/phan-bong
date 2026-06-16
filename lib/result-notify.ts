import { prisma } from "@/lib/db"
import { notifyUser } from "@/lib/notify"

const BET_LABELS: Record<string, string> = {
  ah: "kèo chấp",
  ou: "tổng bàn",
  exact: "tỉ số",
  "1x2": "1X2",
}

type GradedPick = {
  userId: string
  result: string | null
  points: number
  betType: string
}

function formatPoints(points: number): string {
  return points > 0 ? `+${points}` : `${points}`
}

function formatResultBody(preds: GradedPick[], streak: number): string {
  const parts = preds.map(p => {
    const label = BET_LABELS[p.betType] ?? p.betType
    const pts = formatPoints(p.points)
    return p.result === "win" ? `Thắng ${label} (${pts} xu)` : `Thua ${label} (${pts} xu)`
  })

  let streakPart = ""
  if (streak >= 3) streakPart = ` · Streak ${streak}🔥`
  else if (streak > 0) streakPart = ` · Streak ${streak}`
  else if (preds.every(p => p.result === "loss")) streakPart = " · Streak đã reset"

  return parts.join(" · ") + streakPart
}

/** Gửi thông báo kết quả chi tiết cho mọi user đã được chấm điểm trận này. */
export async function notifyMatchResults(
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  scoreHome: number,
  scoreAway: number,
): Promise<number> {
  const predictions = await prisma.prediction.findMany({
    where: { matchId, betType: { not: "skip" }, result: { in: ["win", "loss"] } },
    select: { userId: true, result: true, points: true, betType: true },
  })
  if (predictions.length === 0) return 0

  const byUser = new Map<string, GradedPick[]>()
  for (const p of predictions) {
    const list = byUser.get(p.userId) ?? []
    list.push(p)
    byUser.set(p.userId, list)
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...byUser.keys()] } },
    select: { id: true, streak: true },
  })
  const streakByUser = new Map(users.map(u => [u.id, u.streak]))

  let count = 0
  for (const [userId, preds] of byUser) {
    const body = formatResultBody(preds, streakByUser.get(userId) ?? 0)
    const won = preds.some(p => p.result === "win")
    const emoji = won ? "🎉" : "😢"

    await notifyUser({
      userId,
      type: "result",
      title: `⚽ ${homeTeam} vs ${awayTeam} ${scoreHome}-${scoreAway}`,
      body: `${emoji} ${body}`,
      url: `/matches/${matchId}`,
      matchId,
    }).catch(() => {})
    count++
  }
  return count
}
