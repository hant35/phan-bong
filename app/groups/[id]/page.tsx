import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { GroupDetailView } from "./view"

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      _count: { select: { members: true } },
      admin: { select: { id: true, name: true, avatar: true } },
    },
  })
  if (!group) notFound()

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    orderBy: { points: "desc" },
    include: { user: { select: { id: true, name: true, displayName: true, avatar: true, streak: true } } },
  })
  const myIdx = members.findIndex(m => m.userId === user.id)
  const myRank = myIdx + 1
  const myMembership = members[myIdx]

  const activities = await prisma.activity.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true, avatar: true } } },
  })

  const upcomingMatches = await prisma.match.findMany({
    where: { status: "scheduled" },
    orderBy: { kickoffAt: "asc" },
    take: 3,
    include: { predictions: { where: { userId: user.id } } },
  })

  // Group stats
  const totalPicks = await prisma.prediction.count({ where: { user: { memberships: { some: { groupId: id } } } } })
  const correctPicks = await prisma.prediction.count({ where: { user: { memberships: { some: { groupId: id } } }, result: "win" } })
  const totalResolved = await prisma.prediction.count({ where: { user: { memberships: { some: { groupId: id } } }, result: { in: ["win", "loss"] } } })

  return <GroupDetailView
    group={{
      id: group.id, name: group.name, visibility: group.visibility, inviteCode: group.inviteCode,
      memberCount: group._count.members, myRank, myPoints: myMembership?.points ?? 0,
      adminId: group.admin.id,
    }}
    members={members.map((m, i) => ({
      rank: i + 1, userId: m.userId, name: m.user.name, displayName: m.user.displayName ?? "",
      avatar: m.user.avatar ?? "??", streak: m.user.streak, points: m.points,
      wins: m.wins, losses: m.losses, skipped: m.skipped,
      isMe: user.id === m.userId, isAdmin: m.userId === group.admin.id,
    }))}
    activities={activities.map(a => ({
      id: a.id, type: a.type, action: a.action, target: a.target,
      user: a.user.name, avatar: a.user.avatar ?? "??", createdAt: a.createdAt.toISOString(),
    }))}
    upcomingMatches={upcomingMatches.map(m => ({
      id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      homeFlag: m.homeFlag, awayFlag: m.awayFlag, kickoffAt: m.kickoffAt.toISOString(),
      hasPick: m.predictions.length > 0,
    }))}
    stats={{
      totalPicks,
      winRate: totalResolved > 0 ? Math.round(correctPicks / totalResolved * 100) : 0,
      activityPerDay: Math.round(activities.length / 7),
    }}
    champion={members[0] ? {
      name: members[0].user.name, displayName: members[0].user.displayName ?? "",
      avatar: members[0].user.avatar ?? "??", points: members[0].points,
      correct: 0, total: 0,
      streak: members[0].user.streak,
    } : null}
  />
}
