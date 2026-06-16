import { prisma } from "@/lib/db"
import { notifyUser } from "@/lib/notify"

const REMINDER_WINDOWS = [
  { minutes: 30, label: "30 phút" },
  { minutes: 5, label: "5 phút" },
] as const

/** Nhắc user chưa đặt kèo trước kickoff (T-30p, T-5p). Cron 5 phút → cửa sổ ±3 phút. */
export async function sendKickoffReminders(now: Date): Promise<string[]> {
  const log: string[] = []

  for (const { minutes, label } of REMINDER_WINDOWS) {
    const windowStart = new Date(now.getTime() + (minutes - 3) * 60 * 1000)
    const windowEnd = new Date(now.getTime() + (minutes + 3) * 60 * 1000)

    const matches = await prisma.match.findMany({
      where: {
        status: "scheduled",
        kickoffAt: { gte: windowStart, lte: windowEnd },
        OR: [{ ahLine: { not: null } }, { ouLine: { not: null } }],
      },
    })

    for (const match of matches) {
      const configs = await prisma.groupMatchConfig.findMany({
        where: { matchId: match.id },
        select: { groupId: true, group: { select: { name: true } } },
      })
      if (configs.length === 0) continue

      let sent = 0
      for (const { groupId, group } of configs) {
        const members = await prisma.groupMember.findMany({
          where: { groupId },
          select: { userId: true },
        })
        const picked = await prisma.prediction.findMany({
          where: {
            matchId: match.id,
            groupId,
            betType: { not: "skip" },
          },
          select: { userId: true },
        })
        const pickedSet = new Set(picked.map(p => p.userId))

        for (const member of members) {
          if (pickedSet.has(member.userId)) continue

          const title = `⏰ ${match.homeTeam} vs ${match.awayTeam} — còn ${label}`
          const exists = await prisma.notification.findFirst({
            where: { userId: member.userId, matchId: match.id, type: "kickoff_soon", title },
          })
          if (exists) continue

          await notifyUser({
            userId: member.userId,
            type: "kickoff_soon",
            title,
            body: minutes <= 5
              ? `Hội "${group.name}": bạn vẫn chưa đoán! Nhanh tay kẻo trễ deadline.`
              : `Hội "${group.name}": trận sẽ bắt đầu sau ${label}. Bạn chưa đặt kèo.`,
            url: `/matches/${match.id}`,
            matchId: match.id,
          }).catch(() => {})
          sent++
        }
      }

      if (sent > 0) {
        log.push(`⏰ Nhắc kickoff ${label}: ${match.homeTeam} vs ${match.awayTeam} → ${sent} người`)
      }
    }
  }

  return log
}
