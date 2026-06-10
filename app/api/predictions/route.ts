import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get("limit") ?? "50")

  const picks = await prisma.prediction.findMany({
    where: { userId: user.id },
    include: { match: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return NextResponse.json({
    predictions: picks.map(p => ({
      id: p.id, matchId: p.matchId,
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

  const { matchId, betType, side, homeScore, awayScore, confidence } = await req.json()
  if (!matchId || !betType) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 })

  // Validate betType
  const validBetTypes = ["ah", "ou", "exact"]
  if (!validBetTypes.includes(betType)) {
    return NextResponse.json({ error: "Loại kèo không hợp lệ. Chỉ chấp nhận: kèo chấp, tài/xỉu, tỉ số." }, { status: 400 })
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return NextResponse.json({ error: "Trận không tồn tại" }, { status: 404 })

  // Rule 1: Chỉ được đoán khi trận chưa bắt đầu
  if (match.status !== "scheduled") return NextResponse.json({ error: "Kèo đã khóa — trận đã bắt đầu hoặc kết thúc" }, { status: 400 })
  if (match.kickoffAt.getTime() <= Date.now()) return NextResponse.json({ error: "Trận đã đến giờ đá, không thể đoán nữa" }, { status: 400 })

  // Rule 2: Phải có kèo trước khi đoán (ah/ou)
  if (betType === "ah" && match.ahLine == null) {
    return NextResponse.json({ error: "Kèo chấp chưa được set cho trận này" }, { status: 400 })
  }
  if (betType === "ou" && match.ouLine == null) {
    return NextResponse.json({ error: "Kèo tài/xỉu chưa được set cho trận này" }, { status: 400 })
  }

  // Rule 3: Validate side theo betType
  if (betType === "ah" && !["home", "away"].includes(side)) {
    return NextResponse.json({ error: "Kèo chấp phải chọn Nhà hoặc Khách" }, { status: 400 })
  }
  if (betType === "ou" && !["over", "under"].includes(side)) {
    return NextResponse.json({ error: "Tài/xỉu phải chọn Tài hoặc Xỉu" }, { status: 400 })
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

  // Rule 4: Confidence 1-5
  const conf = Math.max(1, Math.min(5, Math.round(confidence ?? 3)))

  const pred = await prisma.prediction.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    update: { betType, side: betType === "exact" ? null : side, homeScore, awayScore, confidence: conf },
    create: { userId: user.id, matchId, betType, side: betType === "exact" ? null : side, homeScore, awayScore, confidence: conf },
  })

  return NextResponse.json({ prediction: pred })
}
