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

  // Lấy group match configs để hiển thị kèo riêng của hội
  const groupConfigs = await prisma.groupMatchConfig.findMany({
    where: { groupId: id },
    select: { matchId: true, ahLine: true, ouLine: true, allowedBetTypes: true, pointsMultiplier: true, lockMinutes: true, blindMode: true },
  })
  const configMap: Record<string, { ahLine: number | null; ouLine: number | null; allowedBetTypes: string[]; pointsMultiplier: number; lockMinutes: number; blindMode: boolean }> = {}
  for (const c of groupConfigs) {
    configMap[c.matchId] = {
      ahLine: c.ahLine,
      ouLine: c.ouLine,
      allowedBetTypes: JSON.parse(c.allowedBetTypes),
      pointsMultiplier: c.pointsMultiplier,
      lockMinutes: c.lockMinutes,
      blindMode: c.blindMode,
    }
  }

  const upcomingMatches = await prisma.match.findMany({
    where: { status: "scheduled", kickoffAt: { gt: new Date() } },
    orderBy: { kickoffAt: "asc" },
    take: 5,
    include: {
      predictions: { where: { userId: user.id, groupId: id } },
    },
  })

  // Group stats (chỉ tính predictions trong hội này)
  const totalPicks = await prisma.prediction.count({ where: { groupId: id } })
  const correctPicks = await prisma.prediction.count({ where: { groupId: id, result: "win" } })
  const totalResolved = await prisma.prediction.count({ where: { groupId: id, result: { in: ["win", "loss"] } } })

  return <GroupDetailView
    group={{
      id: group.id, name: group.name, visibility: group.visibility, inviteCode: group.inviteCode,
      memberCount: group._count.members, myRank, myPoints: myMembership?.points ?? 0,
      adminId: group.admin.id,
    }}
    currentUserId={user.id}
    myRole={myMembership?.role ?? "member"}
    members={members.map((m, i) => ({
      rank: i + 1, userId: m.userId, name: m.user.name, displayName: m.user.displayName ?? "",
      avatar: m.user.avatar ?? "??", streak: m.user.streak, points: m.points,
      wins: m.wins, losses: m.losses, skipped: m.skipped,
      isMe: user.id === m.userId,
      role: m.role,
      isAdmin: m.role === "owner" || m.role === "admin",
    }))}
    activities={activities.map(a => ({
      id: a.id, type: a.type, action: a.action, target: a.target,
      user: a.user.name, avatar: a.user.avatar ?? "??", createdAt: a.createdAt.toISOString(),
    }))}
    upcomingMatches={upcomingMatches.map(m => {
      const cfg = configMap[m.id]
      return {
        id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
        homeFlag: m.homeFlag, awayFlag: m.awayFlag, kickoffAt: m.kickoffAt.toISOString(),
        // Group config ưu tiên hơn global
        ahLine: cfg?.ahLine ?? m.ahLine,
        ouLine: cfg?.ouLine ?? m.ouLine,
        allowedBetTypes: cfg?.allowedBetTypes ?? ["ah", "ou", "exact"],
        pointsMultiplier: cfg?.pointsMultiplier ?? 1,
        blindMode: cfg?.blindMode ?? false,
        hasPick: m.predictions.length > 0,
        myPick: m.predictions[0] ? {
          betType: m.predictions[0].betType,
          side: m.predictions[0].side,
          homeScore: m.predictions[0].homeScore,
          awayScore: m.predictions[0].awayScore,
        } : null,
      }
    })}
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
