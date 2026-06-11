import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"
import { previewGrading } from "@/lib/grading"

// GET /api/admin/matches/grading?matchId=xxx
// Trả về trạng thái tính điểm cho tất cả thành viên trong các hội của 1 trận
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const matchId = req.nextUrl.searchParams.get("matchId")
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 })

  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 })

  // Lấy tất cả predictions cho trận này (bao gồm thông tin group)
  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: {
      user: { select: { id: true, name: true, avatar: true, streak: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: [{ groupId: "asc" }, { createdAt: "asc" }],
  })

  // Lấy tất cả GroupMatchConfig cho trận này
  const groupConfigs = await prisma.groupMatchConfig.findMany({
    where: { matchId },
    select: { groupId: true, ahLine: true, ouLine: true, pointsMultiplier: true },
  })
  const configMap: Record<string, { ahLine: number | null; ouLine: number | null; pointsMultiplier: number }> = {}
  for (const c of groupConfigs) configMap[c.groupId] = { ahLine: c.ahLine, ouLine: c.ouLine, pointsMultiplier: c.pointsMultiplier }

  // Lấy tất cả group có config cho trận này + thành viên
  const configuredGroupIds = [...new Set(predictions.map(p => p.groupId))]
  const groups = await prisma.group.findMany({
    where: { id: { in: configuredGroupIds } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { points: "desc" },
      },
    },
    orderBy: { name: "asc" },
  })

  // Tổng hợp predictions theo group
  const predByGroupUser: Record<string, typeof predictions[0]> = {}
  for (const p of predictions) {
    predByGroupUser[`${p.groupId}:${p.userId}`] = p
  }

  // Tính preview nếu có tỉ số nhưng chưa finished
  let previewResult = null
  if (match.scoreHome != null && match.scoreAway != null && match.status !== "finished") {
    previewResult = await previewGrading(matchId)
  }

  // Build per-group data
  const groupData = groups.map(g => {
    const cfg = configMap[g.id]
    const members = g.members.map(m => {
      const pred = predByGroupUser[`${g.id}:${m.userId}`]
      return {
        userId: m.userId,
        name: m.user.name,
        avatar: m.user.avatar,
        points: m.points,
        wins: m.wins,
        losses: m.losses,
        skipped: m.skipped,
        prediction: pred ? {
          betType: pred.betType,
          side: pred.side,
          homeScore: pred.homeScore,
          awayScore: pred.awayScore,
          confidence: pred.confidence,
          result: pred.result,
          points: pred.points,
        } : null,
      }
    })

    const predCount = members.filter(m => m.prediction && m.prediction.betType !== "skip").length
    const gradedCount = members.filter(m => m.prediction?.result != null).length
    const winCount = members.filter(m => m.prediction?.result === "win").length
    const lossCount = members.filter(m => m.prediction?.result === "loss" && m.prediction.betType !== "skip").length

    return {
      groupId: g.id,
      groupName: g.name,
      ahLine: cfg?.ahLine ?? match.ahLine,
      ouLine: cfg?.ouLine ?? match.ouLine,
      pointsMultiplier: cfg?.pointsMultiplier ?? 1,
      predCount,
      gradedCount,
      winCount,
      lossCount,
      members,
    }
  })

  return NextResponse.json({
    match: {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      scoreHome: match.scoreHome,
      scoreAway: match.scoreAway,
      status: match.status,
      ahLine: match.ahLine,
      ouLine: match.ouLine,
    },
    isGraded: match.status === "finished",
    hasScore: match.scoreHome != null && match.scoreAway != null,
    previewResult,
    groups: groupData,
  })
}
