import { prisma } from "@/lib/db"

/** Xu khởi đầu khi thành viên vào hội. */
export const GROUP_STARTING_POINTS = 100

/** Tổng xu user đang có trên tất cả các hội. */
export async function sumUserGroupPoints(userId: string): Promise<number> {
  const result = await prisma.groupMember.aggregate({
    where: { userId },
    _sum: { points: true },
  })
  return result._sum.points ?? 0
}

/** BXH tổng hợp: cộng xu từ mọi hội của mỗi user. */
export async function getLeaderboardFromGroupPoints() {
  const members = await prisma.groupMember.findMany({
    include: {
      user: {
        select: {
          id: true, name: true, displayName: true, avatar: true, streak: true,
          predictions: { select: { result: true } },
          badges: { include: { badge: true } },
        },
      },
    },
  })

  const pointsByUser = new Map<string, number>()
  const userById = new Map<string, (typeof members)[0]["user"]>()
  for (const m of members) {
    pointsByUser.set(m.userId, (pointsByUser.get(m.userId) ?? 0) + m.points)
    userById.set(m.userId, m.user)
  }

  return [...pointsByUser.entries()]
    .map(([userId, points]) => ({ userId, points, user: userById.get(userId)! }))
    .filter(e => e.user)
    .sort((a, b) => b.points - a.points)
}
