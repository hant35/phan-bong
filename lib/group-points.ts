import { prisma } from "@/lib/db"
import { clampPoints } from "@/lib/hope-star"

/** Xu trong hội = tổng điểm các prediction đã chấm (theo ngôi sao hi vọng). */
export async function getGroupPointsMap(groupId: string): Promise<Record<string, number>> {
  const rows = await prisma.prediction.groupBy({
    by: ["userId"],
    where: {
      groupId,
      betType: { not: "skip" },
      result: { in: ["win", "loss"] },
    },
    _sum: { points: true },
  })

  const map: Record<string, number> = {}
  for (const row of rows) {
    map[row.userId] = clampPoints(0, row._sum.points ?? 0)
  }
  return map
}

/** Đồng bộ GroupMember.points từ tổng prediction — gọi sau khi chấm điểm. */
export async function syncGroupMemberPoints(groupId: string, userIds?: string[]): Promise<void> {
  const where = {
    groupId,
    betType: { not: "skip" as const },
    result: { in: ["win", "loss"] },
    ...(userIds?.length ? { userId: { in: userIds } } : {}),
  }

  const rows = await prisma.prediction.groupBy({
    by: ["userId"],
    where,
    _sum: { points: true },
  })

  const synced = new Set<string>()
  for (const row of rows) {
    synced.add(row.userId)
    await prisma.groupMember.updateMany({
      where: { userId: row.userId, groupId },
      data: { points: clampPoints(0, row._sum?.points ?? 0) },
    })
  }

  // Thành viên chưa có prediction chấm → 0 xu trong hội
  if (userIds?.length) {
    for (const userId of userIds) {
      if (!synced.has(userId)) {
        await prisma.groupMember.updateMany({
          where: { userId, groupId },
          data: { points: 0 },
        })
      }
    }
  }
}
