import { prisma } from "@/lib/db"
import { notifyUser } from "@/lib/notify"

export type GroupRankSnapshot = Map<string, Map<string, number>>

export async function snapshotGroupRanks(groupIds: string[]): Promise<GroupRankSnapshot> {
  const snapshot: GroupRankSnapshot = new Map()
  for (const groupId of groupIds) {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      orderBy: { points: "desc" },
      select: { userId: true },
    })
    snapshot.set(groupId, new Map(members.map((m, i) => [m.userId, i + 1])))
  }
  return snapshot
}

/** Thông báo thành viên bị tụt hạng sau khi chấm điểm. */
export async function notifyOvertakenAfterGrading(
  groupIds: string[],
  rankBefore: GroupRankSnapshot,
): Promise<void> {
  for (const groupId of groupIds) {
    const before = rankBefore.get(groupId)
    if (!before || before.size === 0) continue

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    })

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      orderBy: { points: "desc" },
      include: { user: { select: { id: true, name: true } } },
    })

    for (let i = 0; i < members.length; i++) {
      const member = members[i]
      const newRank = i + 1
      const oldRank = before.get(member.userId)
      if (oldRank == null || newRank <= oldRank) continue

      const passer = i > 0 ? members[i - 1] : null
      const passerName = passer?.user.name ?? "Ai đó"

      await notifyUser({
        userId: member.userId,
        type: "overtaken",
        title: "📈 Bị vượt mặt trên BXH!",
        body: `${passerName} vừa vượt bạn trong hội "${group?.name ?? "hội"}". Bạn đang hạng ${newRank} (trước đó hạng ${oldRank}).`,
        url: `/groups/${groupId}`,
      }).catch(() => {})
    }
  }
}
