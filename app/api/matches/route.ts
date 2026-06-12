import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: {
      predictions: { where: { userId: user.id } },
      _count: { select: { predictions: true } },
    },
  })

  const result = matches.map(m => {
    const blindModeActive = blindMatchIds.has(m.id) && m.status === "scheduled" && m.kickoffAt.getTime() > Date.now()
    return {
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
      predictorsCount: blindModeActive ? 0 : m._count.predictions,
      myPick: m.predictions[0] ? m.predictions[0] : null,
    }
  })
  return NextResponse.json({ matches: result })
}
