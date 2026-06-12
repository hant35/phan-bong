import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const m = await prisma.match.findUnique({
    where: { id },
    include: {
      predictions: {
        include: { user: { select: { id: true, name: true, avatar: true, streak: true } } },
        orderBy: { confidence: "desc" },
      },
    },
  })
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const requestedGroupId = req.nextUrl.searchParams.get("groupId")
  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    select: { groupId: true },
    orderBy: { joinedAt: "asc" },
  })
  const selectedGroupId = memberships.some(mem => mem.groupId === requestedGroupId)
    ? requestedGroupId
    : memberships[0]?.groupId
  const groupConfig = selectedGroupId ? await prisma.groupMatchConfig.findUnique({
    where: { groupId_matchId: { groupId: selectedGroupId, matchId: m.id } },
    select: { blindMode: true },
  }) : null
  const blindModeActive = !!groupConfig?.blindMode && m.status === "scheduled" && m.kickoffAt.getTime() > Date.now()
  const groupPredictions = selectedGroupId ? m.predictions.filter(p => p.groupId === selectedGroupId) : m.predictions
  const visiblePredictions = blindModeActive ? [] : groupPredictions

  const consensus = visiblePredictions.reduce(
    (acc, p) => {
      if (p.side === "home" || p.betType === "exact" && (p.homeScore ?? 0) > (p.awayScore ?? 0)) acc.home++
      else if (p.side === "away" || p.betType === "exact" && (p.homeScore ?? 0) < (p.awayScore ?? 0)) acc.away++
      else acc.draw++
      return acc
    },
    { home: 0, draw: 0, away: 0 }
  )
  const total = visiblePredictions.length || 1
  const consensusPct = visiblePredictions.length > 0 ? {
    home: Math.round(consensus.home / total * 100),
    draw: Math.round(consensus.draw / total * 100),
    away: Math.round(consensus.away / total * 100),
  } : null

  const myPick = m.predictions.find(p => p.userId === user.id && (!selectedGroupId || p.groupId === selectedGroupId))

  return NextResponse.json({
    match: {
      id: m.id,
      homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      homeFlag: m.homeFlag, awayFlag: m.awayFlag,
      homeColor: m.homeColor, awayColor: m.awayColor,
      kickoffAt: m.kickoffAt, stage: m.stage, venue: m.venue,
      status: m.status, scoreHome: m.scoreHome, scoreAway: m.scoreAway, minute: m.minute,
      ahLine: m.ahLine, ouLine: m.ouLine,
      weather: m.weatherIcon ? { icon: m.weatherIcon, temp: m.weatherTemp, condition: m.weatherCond } : null,
      h2h: m.h2hHome !== null ? { home: m.h2hHome, draw: m.h2hDraw, away: m.h2hAway, recent: m.h2hRecent ? JSON.parse(m.h2hRecent) : [] } : null,
      blindModeActive,
      groupConsensus: consensusPct,
      predictorsCount: visiblePredictions.length,
      predictors: visiblePredictions.slice(0, 10).map(p => ({
        userId: p.userId, name: p.user.name, avatar: p.user.avatar, streak: p.user.streak,
        side: p.side, betType: p.betType, confidence: p.confidence,
        homeScore: p.homeScore, awayScore: p.awayScore,
      })),
      myPick: myPick ? {
        betType: myPick.betType, side: myPick.side, homeScore: myPick.homeScore,
        awayScore: myPick.awayScore, confidence: myPick.confidence, result: myPick.result, points: myPick.points,
      } : null,
    }
  })
}
