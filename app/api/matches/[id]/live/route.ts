import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { previewGrading } from "@/lib/grading"

// GET /api/matches/[id]/live — live grading preview + stats
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const match = await prisma.match.findUnique({ where: { id } })
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Get all predictions for this match
  const predictions = await prisma.prediction.findMany({
    where: { matchId: id },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })

  const totalPredictions = predictions.length

  // Count by side for each bet type
  const stats = {
    ah: { home: 0, away: 0 },
    ou: { over: 0, under: 0 },
    "1x2": { home: 0, draw: 0, away: 0 },
    exact: { count: 0 },
  }

  for (const p of predictions) {
    if (p.betType === "ah") {
      if (p.side === "home") stats.ah.home++
      else stats.ah.away++
    } else if (p.betType === "ou") {
      if (p.side === "over") stats.ou.over++
      else stats.ou.under++
    } else if (p.betType === "1x2") {
      if (p.side === "home") stats["1x2"].home++
      else if (p.side === "draw") stats["1x2"].draw++
      else stats["1x2"].away++
    } else if (p.betType === "exact") {
      stats.exact.count++
    }
  }

  // If match has scores, preview grading
  let grading = null
  if (match.scoreHome != null && match.scoreAway != null) {
    grading = await previewGrading(id)
  }

  // Compute win/loss percentages
  let winPercent = 0, lossPercent = 0
  if (grading && grading.totalPredictions > 0) {
    winPercent = Math.round((grading.wins / grading.totalPredictions) * 100)
    lossPercent = 100 - winPercent
  }

  return NextResponse.json({
    matchId: id,
    status: match.status,
    scoreHome: match.scoreHome,
    scoreAway: match.scoreAway,
    minute: match.minute,
    totalPredictions,
    stats,
    grading: grading ? {
      wins: grading.wins,
      losses: grading.losses,
      winPercent,
      lossPercent,
      details: grading.details.map(d => ({
        name: d.name,
        betType: d.betType,
        result: d.result,
        reason: d.reason,
      })),
    } : null,
    // List of who predicted what (for live display)
    predictions: predictions.map(p => ({
      userName: p.user.name,
      avatar: p.user.avatar,
      betType: p.betType,
      side: p.side,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
    })),
  })
}
