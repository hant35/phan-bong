import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getGroupPointsMap } from "@/lib/group-points"
import { GroupsView } from "./view"

export default async function GroupsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
          activities: { orderBy: { createdAt: "desc" }, take: 1, include: { user: { select: { name: true } } } },
        },
      },
    },
  })

  const groups = await Promise.all(memberships.map(async m => {
    const [allMembers, pointsMap] = await Promise.all([
      prisma.groupMember.findMany({ where: { groupId: m.groupId } }),
      getGroupPointsMap(m.groupId),
    ])
    const ranked = [...allMembers].sort(
      (a, b) => (pointsMap[b.userId] ?? 0) - (pointsMap[a.userId] ?? 0),
    )
    const myRank = ranked.findIndex(x => x.userId === user.id) + 1
    const lastAct = m.group.activities[0]
    return {
      id: m.group.id, name: m.group.name, visibility: m.group.visibility,
      inviteCode: m.group.inviteCode, memberCount: m.group._count.members,
      myRank, totalPoints: pointsMap[user.id] ?? 0,
      recentActivity: lastAct ? `${lastAct.user.name} ${lastAct.action} ${lastAct.target}` : "Chưa có hoạt động",
    }
  }))

  return <GroupsView groups={groups} />
}
