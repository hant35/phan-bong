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
    include: { user: { select: { id: true, name: true, displayName: true, statusText: true, avatar: true, streak: true } } },
  })
  const myIdx = members.findIndex(m => m.userId === user.id)
  const myRank = myIdx >= 0 ? myIdx + 1 : members.length + 1
  const myMembership = members[myIdx]

  const activities = await prisma.activity.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true, avatar: true } } },
  })

  // Group match configs
  const groupConfigs = await prisma.groupMatchConfig.findMany({
    where: { groupId: id },
    select: { matchId: true, ahLine: true, ouLine: true, allowedBetTypes: true, pointsMultiplier: true, lockMinutes: true, blindMode: true },
  })
  const configMap: Record<string, { ahLine: number | null; ouLine: number | null; allowedBetTypes: string[]; pointsMultiplier: number; lockMinutes: number; blindMode: boolean }> = {}
  for (const c of groupConfigs) {
    configMap[c.matchId] = {
      ahLine: c.ahLine, ouLine: c.ouLine,
      allowedBetTypes: JSON.parse(c.allowedBetTypes),
      pointsMultiplier: c.pointsMultiplier, lockMinutes: c.lockMinutes, blindMode: c.blindMode,
    }
  }

  // Lấy trận đang live + 5 trận sắp tới (bao gồm cả chưa có config)
  const [liveMatches, scheduledMatches] = await Promise.all([
    prisma.match.findMany({
      where: { status: "live" },
      orderBy: { kickoffAt: "asc" },
      include: { predictions: { where: { userId: user.id, groupId: id } } },
    }),
    prisma.match.findMany({
      where: { status: "scheduled", kickoffAt: { gt: new Date() } },
      orderBy: { kickoffAt: "asc" },
      take: 5,
      include: { predictions: { where: { userId: user.id, groupId: id } } },
    }),
  ])

  const allMatches = [...liveMatches, ...scheduledMatches]
  const matchIds = allMatches.map(m => m.id)
  const now = new Date()

  // Prediction stats per match trong hội (để hiện tỉ lệ)
  const predStats = await prisma.prediction.groupBy({
    by: ["matchId", "side"],
    where: { groupId: id, matchId: { in: matchIds }, betType: { in: ["ah", "ou"] }, side: { not: null } },
    _count: { id: true },
  })
  const statsMap: Record<string, Record<string, number>> = {}
  for (const s of predStats) {
    if (!statsMap[s.matchId]) statsMap[s.matchId] = {}
    statsMap[s.matchId][s.side!] = s._count.id
  }

  // Số trận đã mở kèo trong hội
  const totalConfiguredMatches = groupConfigs.length

  // Số trận user đã đoán (gồm cả trận chưa kết thúc), không tính skip
  const userPredCounts = await prisma.prediction.groupBy({
    by: ["userId"],
    where: { groupId: id, betType: { not: "skip" } },
    _count: { id: true },
  })
  const predCountMap: Record<string, number> = {}
  for (const p of userPredCounts) predCountMap[p.userId] = p._count.id
  const myPredictedCount = predCountMap[user.id] ?? 0

  // Group stats
  const totalPicks = await prisma.prediction.count({ where: { groupId: id, betType: { not: "skip" } } })
  const correctPicks = await prisma.prediction.count({ where: { groupId: id, result: "win" } })
  const totalResolved = await prisma.prediction.count({ where: { groupId: id, result: { in: ["win", "loss"] } } })

  return <GroupDetailView
    group={{
      id: group.id, name: group.name, visibility: group.visibility, inviteCode: group.inviteCode,
      memberCount: group._count.members, myRank, myPoints: myMembership?.points ?? 0,
      myPredicted: myPredictedCount, totalConfiguredMatches,
      adminId: group.admin.id,
    }}
    currentUserId={user.id}
    myRole={user.role === "admin" ? "owner" : (myMembership?.role ?? "member")}
    members={members.map((m, i) => ({
      rank: i + 1, userId: m.userId, name: m.user.name, displayName: m.user.displayName ?? "",
      statusText: m.user.statusText ?? null,
      avatar: m.user.avatar ?? "??", streak: m.user.streak, points: m.points,
      wins: m.wins, losses: m.losses, skipped: m.skipped,
      predicted: predCountMap[m.userId] ?? 0,
      isMe: user.id === m.userId, role: m.role,
      isAdmin: m.role === "owner" || m.role === "admin",
    }))}
    activities={activities.map(a => {
      const blindMatch = allMatches.find(m => {
        const cfg = configMap[m.id]
        return cfg?.blindMode && m.status === "scheduled" && m.kickoffAt > now
          && a.target === `${m.homeTeam} vs ${m.awayTeam}`
      })
      return {
        id: a.id, type: a.type,
        action: a.type === "pick" && blindMatch ? "đã đặt kèo cho trận" : a.action,
        target: a.target,
        user: a.user.name, avatar: a.user.avatar ?? "??", createdAt: a.createdAt.toISOString(),
      }
    })}
    upcomingMatches={allMatches.map(m => {
      const cfg = configMap[m.id]
      const s = statsMap[m.id] ?? {}
      const hideBlindStats = !!cfg?.blindMode && m.status === "scheduled" && m.kickoffAt > now
      const homeCount = hideBlindStats ? 0 : (s["home"] ?? 0)
      const awayCount = hideBlindStats ? 0 : (s["away"] ?? 0)
      const overCount = hideBlindStats ? 0 : (s["over"] ?? 0)
      const underCount = hideBlindStats ? 0 : (s["under"] ?? 0)
      return {
        id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
        homeFlag: m.homeFlag, awayFlag: m.awayFlag,
        kickoffAt: m.kickoffAt.toISOString(),
        isLive: m.status === "live",
        scoreHome: m.scoreHome, scoreAway: m.scoreAway, minute: m.minute,
        hasConfig: !!cfg,
        ahLine: cfg?.ahLine ?? m.ahLine,
        ouLine: cfg?.ouLine ?? m.ouLine,
        allowedBetTypes: cfg?.allowedBetTypes ?? ["ah", "ou", "exact"],
        pointsMultiplier: cfg?.pointsMultiplier ?? 1,
        blindMode: cfg?.blindMode ?? false,
        blindModeActive: hideBlindStats,
        hasPick: m.predictions.length > 0,
        myPick: m.predictions[0] ? {
          betType: m.predictions[0].betType,
          side: m.predictions[0].side,
          homeScore: m.predictions[0].homeScore,
          awayScore: m.predictions[0].awayScore,
          confidence: m.predictions[0].confidence,
        } : null,
        predStats: { homeCount, awayCount, overCount, underCount },
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
      correct: 0, total: 0, streak: members[0].user.streak,
    } : null}
  />
}
