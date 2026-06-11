import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { clampHopeStar, DEFAULT_HOPE_STAR } from "@/lib/hope-star"
import { getCurrentUser } from "@/lib/auth"
import { sendPushToUser } from "@/lib/push"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get("limit") ?? "50")
  const groupId = url.searchParams.get("groupId")

  const picks = await prisma.prediction.findMany({
    where: { userId: user.id, ...(groupId ? { groupId } : {}) },
    include: { match: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return NextResponse.json({
    predictions: picks.map(p => ({
      id: p.id, matchId: p.matchId, groupId: p.groupId,
      match: `${p.match.homeTeam} vs ${p.match.awayTeam}`,
      homeFlag: p.match.homeFlag, awayFlag: p.match.awayFlag,
      betType: p.betType, side: p.side, homeScore: p.homeScore, awayScore: p.awayScore,
      confidence: p.confidence,
      result: p.result ?? (p.match.status === "live" ? "live" : "pending"),
      points: p.points,
      kickoffAt: p.match.kickoffAt,
      actualScore: p.match.scoreHome !== null ? `${p.match.scoreHome}-${p.match.scoreAway}` : null,
      ahLine: p.match.ahLine, ouLine: p.match.ouLine,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { matchId, groupId, betType, side, homeScore, awayScore, confidence } = await req.json()
  if (!matchId || !betType || !groupId) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 })

  // Kiểm tra user là thành viên của hội này
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  })
  if (!membership) return NextResponse.json({ error: "Bạn không phải thành viên của hội này" }, { status: 403 })

  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return NextResponse.json({ error: "Trận không tồn tại" }, { status: 404 })

  // Bắt buộc GroupMatchConfig phải tồn tại — admin hội phải mở kèo trước
  const groupConfig = await prisma.groupMatchConfig.findUnique({
    where: { groupId_matchId: { groupId, matchId } },
  })
  if (!groupConfig) {
    return NextResponse.json({ error: "Admin hội chưa mở kèo cho trận này. Liên hệ admin hội để cấu hình." }, { status: 400 })
  }

  // Xác định kèo áp dụng (group config ưu tiên hơn global, fallback global)
  const effectiveAhLine = groupConfig.ahLine ?? match.ahLine
  const effectiveOuLine = groupConfig.ouLine ?? match.ouLine
  const allowedBetTypes: string[] = JSON.parse(groupConfig.allowedBetTypes)

  // Kiểm tra loại kèo được phép
  if (!allowedBetTypes.includes(betType)) {
    return NextResponse.json({ error: `Hội này không cho phép loại kèo "${betType}"` }, { status: 400 })
  }

  // Rule: Chỉ được đoán khi trận chưa bắt đầu
  if (match.status !== "scheduled") return NextResponse.json({ error: "Kèo đã khóa — trận đã bắt đầu hoặc kết thúc" }, { status: 400 })
  if (match.kickoffAt.getTime() <= Date.now()) return NextResponse.json({ error: "Trận đã đến giờ đá, không thể đoán nữa" }, { status: 400 })

  // Kiểm tra khóa sớm theo group config (lockMinutes > 0)
  const lockMs = (groupConfig?.lockMinutes ?? 0) * 60 * 1000
  if (lockMs > 0 && match.kickoffAt.getTime() - Date.now() < lockMs) {
    const mins = groupConfig!.lockMinutes
    return NextResponse.json({ error: `Hội này khóa kèo trước ${mins} phút trước kickoff` }, { status: 400 })
  }

  if (betType === "ah" && effectiveAhLine == null) {
    return NextResponse.json({ error: "Kèo chấp chưa được set cho trận này" }, { status: 400 })
  }
  if (betType === "ou" && effectiveOuLine == null) {
    return NextResponse.json({ error: "Kèo tổng bàn thắng chưa được set cho trận này" }, { status: 400 })
  }
  if (betType === "ah" && !["home", "away"].includes(side)) {
    return NextResponse.json({ error: "Kèo chấp phải chọn Nhà hoặc Khách" }, { status: 400 })
  }
  if (betType === "ou" && !["over", "under"].includes(side)) {
    return NextResponse.json({ error: "Tổng bàn thắng phải chọn Trên hoặc Dưới" }, { status: 400 })
  }
  if (betType === "exact") {
    if (homeScore == null || awayScore == null || homeScore < 0 || awayScore < 0) {
      return NextResponse.json({ error: "Tỉ số phải >= 0" }, { status: 400 })
    }
    if (homeScore > 20 || awayScore > 20) {
      return NextResponse.json({ error: "Tỉ số không hợp lệ (tối đa 20)" }, { status: 400 })
    }
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
      return NextResponse.json({ error: "Tỉ số phải là số nguyên" }, { status: 400 })
    }
  }

  const conf = clampHopeStar(confidence ?? DEFAULT_HOPE_STAR)

  const existing = await prisma.prediction.findUnique({
    where: { userId_matchId_groupId: { userId: user.id, matchId, groupId } },
  })
  const isNew = !existing

  const pred = await prisma.prediction.upsert({
    where: { userId_matchId_groupId: { userId: user.id, matchId, groupId } },
    update: { betType, side: betType === "exact" ? null : side, homeScore, awayScore, confidence: conf },
    create: { userId: user.id, matchId, groupId, betType, side: betType === "exact" ? null : side, homeScore, awayScore, confidence: conf },
  })

  if (isNew) {
    const matchLabel = `${match.homeTeam} vs ${match.awayTeam}`

    // Mô tả chi tiết cho activity & push
    let pickDetail: string
    let pushDetail: string
    if (betType === "exact") {
      pickDetail = `đã đoán tỉ số ${match.homeTeam} ${homeScore}–${awayScore} ${match.awayTeam} cho trận`
      pushDetail = `Tỉ số ${homeScore}–${awayScore} cho trận ${matchLabel}`
    } else if (betType === "ou") {
      const line = effectiveOuLine ?? match.ouLine
      const sideLabel = side === "over" ? "trên" : "dưới"
      pickDetail = `đã đoán tổng bàn thắng ${sideLabel} ${line ?? "?"} bàn cho trận`
      pushDetail = `Tổng bàn thắng ${sideLabel} ${line ?? "?"} cho trận ${matchLabel}`
    } else {
      // ah
      const line = effectiveAhLine ?? match.ahLine
      const pickedTeam = side === "home" ? match.homeTeam : match.awayTeam
      const otherTeam = side === "home" ? match.awayTeam : match.homeTeam
      const lineStr = line != null ? ` (${match.homeTeam} chấp ${match.awayTeam} ${Math.abs(line)} trái)` : ""
      pickDetail = `đã đoán ${pickedTeam} thắng cho trận`
      pushDetail = `${pickedTeam} thắng${lineStr} — trận ${matchLabel}`
      if (lineStr) pickDetail += "" // line info goes in meta
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { select: { userId: true } } },
    })
    if (group) {
      // Build meta for extra detail (kèo line)
      const meta: Record<string, unknown> = { betType, side, homeScore, awayScore }
      if (betType === "ah") {
        meta.ahLine = effectiveAhLine ?? match.ahLine
      } else if (betType === "ou") {
        meta.ouLine = effectiveOuLine ?? match.ouLine
      }

      await prisma.activity.create({
        data: {
          userId: user.id,
          groupId,
          type: "pick",
          action: pickDetail,
          target: matchLabel,
          meta: JSON.stringify(meta),
        },
      })

      const others = group.members.filter(m => m.userId !== user.id)
      await Promise.allSettled(
        others.map(m => sendPushToUser(
          m.userId,
          `🎯 ${user.name} vừa đặt kèo!`,
          pushDetail,
          `/groups/${groupId}`,
        ))
      )
    }
  }

  return NextResponse.json({ prediction: pred })
}
