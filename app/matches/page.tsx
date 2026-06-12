import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getDefaultGroupId } from "@/lib/default-group"
import { sumUserGroupPoints } from "@/lib/group-points"
import { MatchesView } from "./view"

export default async function MatchesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const defaultGroupId = await getDefaultGroupId(user.id)
  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: {
      predictions: {
        where: {
          userId: user.id,
          ...(defaultGroupId ? { groupId: defaultGroupId } : {}),
        },
      },
      _count: { select: { predictions: true } },
    },
  })
  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  })
  const blindConfigs = memberships.length > 0 ? await prisma.groupMatchConfig.findMany({
    where: {
      groupId: { in: memberships.map(m => m.groupId) },
      blindMode: true,
    },
    select: { matchId: true },
  }) : []
  const blindMatchIds = new Set(blindConfigs.map(c => c.matchId))
  const now = new Date()

  const data = await Promise.all(matches.map(async m => {
    const preds = await prisma.prediction.findMany({ where: { matchId: m.id } })
    const blindModeActive = blindMatchIds.has(m.id) && m.status === "scheduled" && m.kickoffAt > now
    const visiblePreds = blindModeActive ? [] : preds
    const total = visiblePreds.length || 1
    const home = visiblePreds.filter(p => p.side === "home" || (p.betType === "exact" && (p.homeScore ?? 0) > (p.awayScore ?? 0))).length
    const away = visiblePreds.filter(p => p.side === "away" || (p.betType === "exact" && (p.homeScore ?? 0) < (p.awayScore ?? 0))).length
    const draw = visiblePreds.length - home - away
    const myP = m.predictions[0]
    return {
      id: m.id,
      homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      homeFlag: m.homeFlag, awayFlag: m.awayFlag,
      homeColor: m.homeColor, awayColor: m.awayColor,
      kickoffAt: m.kickoffAt.toISOString(), stage: m.stage,
      status: m.status, scoreHome: m.scoreHome, scoreAway: m.scoreAway, minute: m.minute,
      ahLine: m.ahLine, ouLine: m.ouLine,
      consensus: visiblePreds.length > 0 ? {
        home: Math.round(home / total * 100),
        draw: Math.round(draw / total * 100),
        away: Math.round(away / total * 100),
      } : null,
      predictorsCount: blindModeActive ? 0 : m._count.predictions,
      myPick: myP ? { betType: myP.betType, result: myP.result, points: myP.points } : null,
    }
  }))

  const myPickedCount = data.filter(m => m.myPick).length
  const userPoints = await sumUserGroupPoints(user.id)
  return <MatchesView matches={data} myPickedCount={myPickedCount} userPoints={userPoints} />
}
