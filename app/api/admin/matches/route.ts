import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"
import { gradeMatch } from "@/lib/grading"

// POST — create new match
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const body = await req.json()
  const { homeTeam, awayTeam, homeFlag, awayFlag, homeColor, awayColor, kickoffAt, stage, venue, ahLine, ouLine } = body

  if (!homeTeam || !awayTeam || !homeFlag || !awayFlag || !kickoffAt || !stage) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc (homeTeam, awayTeam, homeFlag, awayFlag, kickoffAt, stage)" }, { status: 400 })
  }

  const match = await prisma.match.create({
    data: {
      homeTeam, awayTeam, homeFlag, awayFlag,
      homeColor: homeColor || null,
      awayColor: awayColor || null,
      kickoffAt: new Date(kickoffAt),
      stage, venue: venue || null,
      ahLine: ahLine ?? null,
      ouLine: ouLine ?? null,
      status: "scheduled",
    },
  })
  return NextResponse.json({ match }, { status: 201 })
}

// DELETE — delete match
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "Match ID required" }, { status: 400 })

  await prisma.prediction.deleteMany({ where: { matchId: id } })
  await prisma.match.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// PATCH — update match odds, status, score
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const body = await req.json()
  const { id, ahLine, ouLine, status, scoreHome, scoreAway, minute } = body

  if (!id) return NextResponse.json({ error: "Match ID required" }, { status: 400 })

  // Check current match state before update
  const currentMatch = await prisma.match.findUnique({ where: { id } })
  if (!currentMatch) return NextResponse.json({ error: "Match not found" }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (ahLine !== undefined) data.ahLine = ahLine
  if (ouLine !== undefined) data.ouLine = ouLine
  if (status !== undefined) data.status = status
  if (scoreHome !== undefined) data.scoreHome = scoreHome
  if (scoreAway !== undefined) data.scoreAway = scoreAway
  if (minute !== undefined) data.minute = minute

  // ── Validation rules ──
  const newStatus = status ?? currentMatch.status
  const newScoreHome = scoreHome !== undefined ? scoreHome : currentMatch.scoreHome
  const newScoreAway = scoreAway !== undefined ? scoreAway : currentMatch.scoreAway
  const hasScore = newScoreHome != null && newScoreAway != null

  // Rule 1: Có tỉ số → trạng thái phải là "live" hoặc "finished"
  if (hasScore && newStatus === "scheduled") {
    return NextResponse.json({
      error: "Không thể đặt tỉ số khi trận đấu chưa bắt đầu. Hãy chuyển trạng thái sang 'Đang đá' trước."
    }, { status: 400 })
  }

  // Rule 2: Chuyển sang "finished" phải có tỉ số
  if (newStatus === "finished" && !hasScore) {
    return NextResponse.json({
      error: "Không thể kết thúc trận đấu khi chưa có tỉ số."
    }, { status: 400 })
  }

  // Rule 3: Không cho phép chuyển ngược từ finished → scheduled
  if (currentMatch.status === "finished" && status === "scheduled") {
    return NextResponse.json({
      error: "Không thể chuyển trận đã kết thúc về trạng thái chưa đá."
    }, { status: 400 })
  }

  // Rule 4: Khi chuyển về scheduled phải xóa tỉ số
  if (status === "scheduled") {
    data.scoreHome = null
    data.scoreAway = null
    data.minute = null
  }

  // Rule 5: Không cho sửa kèo khi trận đã kết thúc
  if (currentMatch.status === "finished" && (ahLine !== undefined || ouLine !== undefined)) {
    return NextResponse.json({
      error: "Không thể sửa kèo khi trận đã kết thúc."
    }, { status: 400 })
  }

  // Rule 6: Kèo chấp và tài xỉu phải có trước khi trận bắt đầu
  if (status === "live" && currentMatch.status === "scheduled") {
    if (currentMatch.ahLine == null && ahLine === undefined) {
      return NextResponse.json({
        error: "Phải set kèo chấp (AH) trước khi bắt đầu trận đấu."
      }, { status: 400 })
    }
    if (currentMatch.ouLine == null && ouLine === undefined) {
      return NextResponse.json({
        error: "Phải set kèo tổng bàn thắng (O/U) trước khi bắt đầu trận đấu."
      }, { status: 400 })
    }
  }

  const match = await prisma.match.update({ where: { id }, data })

  // ── Auto-grade when status changes to "finished" ──
  let gradingResult = null
  const isNowFinished = (status === "finished" || match.status === "finished") && currentMatch.status !== "finished"
  if (isNowFinished && match.scoreHome != null && match.scoreAway != null) {
    gradingResult = await gradeMatch(id)
  }

  return NextResponse.json({ match, gradingResult })
}
