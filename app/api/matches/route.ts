import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: {
      predictions: user ? { where: { userId: user.id } } : false,
      _count: { select: { predictions: true } },
    },
  })

  const result = matches.map(m => ({
    id: m.id,
    homeTeam: m.homeTeam, awayTeam: m.awayTeam,
    homeFlag: m.homeFlag, awayFlag: m.awayFlag,
    homeColor: m.homeColor, awayColor: m.awayColor,
    kickoffAt: m.kickoffAt, stage: m.stage, venue: m.venue,
    status: m.status, scoreHome: m.scoreHome, scoreAway: m.scoreAway, minute: m.minute,
    ahLine: m.ahLine, ouLine: m.ouLine,
    weather: m.weatherIcon ? { icon: m.weatherIcon, temp: m.weatherTemp, condition: m.weatherCond } : null,
    h2h: m.h2hHome !== null ? { home: m.h2hHome, draw: m.h2hDraw, away: m.h2hAway, recent: m.h2hRecent ? JSON.parse(m.h2hRecent) : [] } : null,
    predictorsCount: m._count.predictions,
    myPick: user && m.predictions[0] ? m.predictions[0] : null,
  }))
  return NextResponse.json({ matches: result })
}
