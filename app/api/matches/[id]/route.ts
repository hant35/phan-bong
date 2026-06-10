import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentUser()
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

  const consensus = m.predictions.reduce(
    (acc, p) => {
      if (p.side === "home" || p.betType === "exact" && (p.homeScore ?? 0) > (p.awayScore ?? 0)) acc.home++
      else if (p.side === "away" || p.betType === "exact" && (p.homeScore ?? 0) < (p.awayScore ?? 0)) acc.away++
      else acc.draw++
      return acc
    },
    { home: 0, draw: 0, away: 0 }
  )
  const total = m.predictions.length || 1
  const consensusPct = {
    home: Math.round(consensus.home / total * 100),
    draw: Math.round(consensus.draw / total * 100),
    away: Math.round(consensus.away / total * 100),
  }

  const myPick = user ? m.predictions.find(p => p.userId === user.id) : null

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
      groupConsensus: consensusPct,
      predictorsCount: m.predictions.length,
      predictors: m.predictions.slice(0, 10).map(p => ({
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
