import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendPushToUser } from "@/lib/push"

// ══════════════════════════════════════════════════════════════
// Cron Job — chạy mỗi 1 phút, tự động chuyển trạng thái trận đấu
// GET /api/cron — có thể gọi từ client setInterval hoặc external cron
// ══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  // Optional: verify cron secret for external callers
  const secret = req.nextUrl.searchParams.get("secret")
  const expectedSecret = process.env.CRON_SECRET

  // If CRON_SECRET is set, validate it (for production security)
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const results: string[] = []

  // ── 1. scheduled → live: trận đã đến giờ kickoff ──
  const shouldStart = await prisma.match.findMany({
    where: {
      status: "scheduled",
      kickoffAt: { lte: now },
    },
  })

  for (const match of shouldStart) {
    // Chỉ chuyển sang live nếu đã có kèo
    if (match.ahLine != null && match.ouLine != null) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: "live",
          scoreHome: match.scoreHome ?? 0,
          scoreAway: match.scoreAway ?? 0,
          minute: 1,
        },
      })
      results.push(`⚽ ${match.homeTeam} vs ${match.awayTeam} → LIVE`)

      // Gửi push notification cho tất cả user đã đặt kèo trận này
      const predictors = await prisma.prediction.findMany({
        where: { matchId: match.id },
        select: { userId: true },
      })
      for (const p of predictors) {
        await sendPushToUser(
          p.userId,
          `⚽ Trận đấu bắt đầu!`,
          `${match.homeTeam} vs ${match.awayTeam} vừa bắt đầu`,
          `/matches/${match.id}`,
        ).catch(() => {})
      }
    } else {
      results.push(`⚠️ ${match.homeTeam} vs ${match.awayTeam} — thiếu kèo, không thể bắt đầu`)
    }
  }

  // ── 2. live quá 120 phút → tự kết thúc (safety net) ──
  const staleLive = await prisma.match.findMany({
    where: {
      status: "live",
      kickoffAt: { lte: new Date(now.getTime() - 120 * 60 * 1000) }, // > 120 phút
    },
  })

  for (const match of staleLive) {
    // Chỉ auto-finish nếu đã có tỉ số
    if (match.scoreHome != null && match.scoreAway != null) {
      results.push(`⏰ ${match.homeTeam} vs ${match.awayTeam} — live > 120p, cần admin kết thúc thủ công`)
    }
  }

  // ── 3. Tự tăng minute cho trận live ──
  const liveMatches = await prisma.match.findMany({
    where: { status: "live" },
  })

  for (const match of liveMatches) {
    const elapsedMinutes = Math.floor((now.getTime() - match.kickoffAt.getTime()) / 60000)
    const newMinute = Math.min(elapsedMinutes, 90) // cap ở 90 phút (hiệp phụ admin set thủ công)
    if (newMinute !== match.minute) {
      await prisma.match.update({
        where: { id: match.id },
        data: { minute: newMinute },
      })
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    started: shouldStart.length,
    liveUpdated: liveMatches.length,
    staleWarnings: staleLive.length,
    log: results,
  })
}
