import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"
import { gradeMatch } from "@/lib/grading"

// 90p thi đấu + 15p bù giờ + 10p buffer chờ API free update tỉ số cuối
const MATCH_DURATION_MS = 115 * 60 * 1000

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

// PATCH — reset + re-grade 1 trận (dùng khi trận bị chấm sai vì tỉ số sai/sớm)
// Body: { matchId: string }
// Quy trình:
//   1. Reset tất cả prediction của trận về result=null
//   2. Replay tất cả prediction khác theo thứ tự thời gian để tính lại balance đúng cho từng user-group
//   3. Gọi gradeMatch() với tỉ số hiện tại (đúng)
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { matchId } = await req.json().catch(() => ({ matchId: undefined }))
  if (!matchId) return NextResponse.json({ error: "Cần matchId" }, { status: 400 })

  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return NextResponse.json({ error: "Trận không tồn tại" }, { status: 404 })
  if (match.scoreHome == null || match.scoreAway == null) {
    return NextResponse.json({ error: "Trận chưa có tỉ số" }, { status: 400 })
  }

  // 1. Lấy danh sách predictions đã chấm (để biết user-group nào bị ảnh hưởng)
  const gradedPreds = await prisma.prediction.findMany({
    where: { matchId, result: { not: null } },
    select: { userId: true, groupId: true, result: true, points: true, betType: true },
  })

  const affectedPairs = new Map<string, { userId: string; groupId: string }>()
  for (const p of gradedPreds) {
    affectedPairs.set(`${p.userId}:${p.groupId}`, { userId: p.userId, groupId: p.groupId })
  }

  // 2. Reset tất cả predictions của trận này
  await prisma.prediction.updateMany({
    where: { matchId },
    data: { result: null, points: 0 },
  })

  // 3. Với mỗi user-group bị ảnh hưởng: replay tất cả prediction ĐÃ CHẤM KHÁC
  //    theo thứ tự thời gian, tính lại balance với clampPoints, rồi update GroupMember
  for (const { userId, groupId } of affectedPairs.values()) {
    const otherPreds = await prisma.prediction.findMany({
      where: {
        userId, groupId,
        matchId: { not: matchId },
        result: { not: null },
      },
      orderBy: { createdAt: "asc" },
      select: { points: true, result: true, betType: true },
    })

    let balance = 100
    let wins = 0, losses = 0, skipped = 0
    for (const p of otherPreds) {
      balance = Math.max(0, balance + p.points)
      if (p.result === "win") wins++
      else if (p.betType === "skip") skipped++
      else losses++
    }

    await prisma.groupMember.update({
      where: { userId_groupId: { userId, groupId } },
      data: { points: balance, wins, losses, skipped },
    })
  }

  // 4. Re-grade với tỉ số đúng
  const now = new Date()
  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: "finished",
      finishedAt: match.finishedAt ?? now,
      gradedAt: null, // reset để gradeMatch() bên dưới ghi lại
    },
  })
  const result = await gradeMatch(matchId)
  // Đánh dấu đã chấm để cron không chấm lại
  await prisma.match.update({ where: { id: matchId }, data: { gradedAt: now } })

  return NextResponse.json({
    ok: true,
    match: `${match.homeTeam} vs ${match.awayTeam}`,
    score: `${match.scoreHome}-${match.scoreAway}`,
    affectedUserGroups: affectedPairs.size,
    resetCount: gradedPreds.length,
    regrade: result ? { wins: result.wins, losses: result.losses, newlyGraded: result.newlyGraded } : null,
  })
}

