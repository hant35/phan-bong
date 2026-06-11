import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"
import { gradeMatch } from "@/lib/grading"

const MATCH_DURATION_MS = 105 * 60 * 1000

function gradingMatchWhere(now = new Date()) {
  return {
    OR: [
      { status: "finished" as const },
      {
        status: { in: ["live" as const, "scheduled" as const] },
        scoreHome: { not: null },
        scoreAway: { not: null },
        kickoffAt: { lte: new Date(now.getTime() - MATCH_DURATION_MS) },
      },
    ],
  }
}

async function ensureMatchFinished(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return { error: "Trận không tồn tại", status: 404 as const }
  if (match.status === "finished") return { match }

  if (match.scoreHome == null || match.scoreAway == null) {
    return { error: "Trận chưa có tỉ số chính thức", status: 400 as const }
  }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { status: "finished" },
  })
  return { match: updated }
}

// GET — kiểm tra trạng thái chấm điểm các trận finished
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const now = new Date()
  const finishedMatches = await prisma.match.findMany({
    where: gradingMatchWhere(now),
    orderBy: { kickoffAt: "desc" },
    take: 20,
    include: {
      predictions: {
        select: { id: true, result: true, betType: true, points: true, groupId: true },
      },
      groupConfigs: {
        select: { groupId: true, group: { select: { name: true } } },
      },
    },
  })

  const summary = finishedMatches.map(m => {
    const total = m.predictions.filter(p => p.betType !== "skip").length
    const graded = m.predictions.filter(p => p.result !== null && p.betType !== "skip").length
    const wins = m.predictions.filter(p => p.result === "win").length
    const losses = m.predictions.filter(p => p.result === "loss" && p.betType !== "skip").length
    const skips = m.predictions.filter(p => p.betType === "skip").length
    const ungraded = total - graded
    const groups = m.groupConfigs.map(c => c.group.name)

    return {
      matchId: m.id,
      match: `${m.homeTeam} vs ${m.awayTeam}`,
      score: `${m.scoreHome}-${m.scoreAway}`,
      kickoffAt: m.kickoffAt.toISOString(),
      dbStatus: m.status,
      status: m.status !== "finished"
        ? "⚠️ CÓ TỈ SỐ — CHƯA KẾT THÚC"
        : ungraded > 0 ? "⚠️ CHƯA CHẤM XONG" : "✅ Đã chấm",
      totalPredictions: total,
      graded,
      ungraded,
      wins,
      losses,
      skips,
      groups,
    }
  })

  const ungradedCount = summary.filter(s => s.ungraded > 0).length

  return NextResponse.json({
    total: summary.length,
    ungradedMatches: ungradedCount,
    matches: summary,
  })
}

// POST — chấm điểm thủ công cho 1 hoặc tất cả trận chưa chấm
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { matchId } = await req.json().catch(() => ({ matchId: undefined }))

  // Nếu truyền matchId → chấm 1 trận
  if (matchId) {
    const ensured = await ensureMatchFinished(matchId)
    if ("error" in ensured) {
      return NextResponse.json({ error: ensured.error }, { status: ensured.status })
    }
    const match = ensured.match

    const result = await gradeMatch(matchId)
    return NextResponse.json({
      ok: true,
      match: `${match.homeTeam} vs ${match.awayTeam}`,
      result,
    })
  }

  // Không truyền matchId → chấm TẤT CẢ trận finished chưa chấm xong
  const now = new Date()
  const finishedMatches = await prisma.match.findMany({
    where: gradingMatchWhere(now),
    include: {
      predictions: {
        where: { result: null, betType: { not: "skip" } },
        select: { id: true },
      },
    },
  })

  const ungraded = finishedMatches.filter(m => m.predictions.length > 0)
  const results: { match: string; wins: number; losses: number; skipped: number }[] = []

  for (const m of ungraded) {
    const ensured = await ensureMatchFinished(m.id)
    if ("error" in ensured) continue
    const gr = await gradeMatch(m.id)
    if (gr) {
      results.push({
        match: `${m.homeTeam} vs ${m.awayTeam}`,
        wins: gr.wins,
        losses: gr.losses,
        skipped: gr.skipped,
      })
    }
  }

  return NextResponse.json({
    ok: true,
    gradedCount: results.length,
    totalFinished: finishedMatches.length,
    results,
  })
}
