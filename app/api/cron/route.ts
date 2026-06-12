import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { notifyUser } from "@/lib/notify"
import { gradeMatch } from "@/lib/grading"
import { sendKickoffReminders } from "@/lib/kickoff-reminders"
import { notifyMatchResults } from "@/lib/result-notify"
import { syncFootballData } from "@/lib/sync-sources"
import { requireCronOrAdmin } from "@/lib/request-auth"

// ══════════════════════════════════════════════════════════════
// Cron Job — tự động chuyển trạng thái trận đấu
// GET /api/cron — chỉ cho Vercel/external cron có secret hoặc admin
// ══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const allowed = await requireCronOrAdmin(req)
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const results: string[] = []

  // ── 0a. Nhắc trước kickoff (T-30p, T-5p) ──
  try {
    const reminderLog = await sendKickoffReminders(now)
    results.push(...reminderLog)
  } catch (e) {
    results.push(`❌ Kickoff reminders failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── 0. Đồng bộ từ Football-Data.org (API uy tín nhất) ──
  const fdKey = process.env.FOOTBALL_DATA_API_KEY
  if (fdKey) {
    try {
      const syncResult = await syncFootballData(fdKey)
      if (syncResult.updated > 0) {
        results.push(`🔄 Sync Football-Data: ${syncResult.updated} cập nhật`)
      }
      if (syncResult.errors.length > 0) {
        results.push(`⚠️ Sync errors: ${syncResult.errors.join(", ")}`)
      }
      for (const d of syncResult.details) {
        if (d.startsWith("🏆") || d.startsWith("📲")) results.push(d)
      }
    } catch (e) {
      results.push(`❌ Sync failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── 1. scheduled → live: trận đã đến giờ kickoff (trong vòng 48 giờ gần nhất) ──
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const shouldStart = await prisma.match.findMany({
    where: {
      status: "scheduled",
      kickoffAt: { lte: now, gte: fortyEightHoursAgo },
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
        await notifyUser({
          userId: p.userId,
          type: "kickoff",
          title: "⚽ Trận đấu bắt đầu!",
          body: `${match.homeTeam} vs ${match.awayTeam} vừa bắt đầu`,
          url: `/matches/${match.id}`,
          matchId: match.id,
        }).catch(() => {})
      }
    } else {
      results.push(`⚠️ ${match.homeTeam} vs ${match.awayTeam} — thiếu kèo, không thể bắt đầu`)
    }
  }

  // ── 2. scheduled/live đã có tỉ số, qua giờ đá > 105 phút → tự kết thúc ──
  const shouldFinish = await prisma.match.findMany({
    where: {
      status: { in: ["scheduled", "live"] },
      scoreHome: { not: null },
      scoreAway: { not: null },
      kickoffAt: { lte: new Date(now.getTime() - 105 * 60 * 1000) },
    },
  })

  for (const match of shouldFinish) {
    await prisma.match.update({
      where: { id: match.id },
      data: { status: "finished" },
    })
    results.push(`🏁 ${match.homeTeam} vs ${match.awayTeam} → FINISHED (${match.scoreHome}-${match.scoreAway})`)

    try {
      const gr = await gradeMatch(match.id)
      if (gr) {
        results.push(`🏆 Chấm điểm: ${gr.wins} thắng, ${gr.losses} thua, ${gr.skipped} bỏ lỡ`)
        if (gr.newlyGraded > 0 && match.scoreHome != null && match.scoreAway != null) {
          const n = await notifyMatchResults(
            match.id, match.homeTeam, match.awayTeam, match.scoreHome, match.scoreAway,
          ).catch(() => 0)
          results.push(`📲 Thông báo cho ${n} người`)
        }
      }
    } catch (e) {
      results.push(`❌ Lỗi chấm điểm: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── 3. live quá 120 phút → tự kết thúc (safety net) ──
  const staleLive = await prisma.match.findMany({
    where: {
      status: "live",
      kickoffAt: { lte: new Date(now.getTime() - 120 * 60 * 1000) }, // > 120 phút
    },
  })

  for (const match of staleLive) {
    // Auto-finish nếu đã có tỉ số và live > 120p
    if (match.scoreHome != null && match.scoreAway != null) {
      await prisma.match.update({
        where: { id: match.id },
        data: { status: "finished" },
      })
      results.push(`⏰ ${match.homeTeam} vs ${match.awayTeam} → FINISHED (auto, live > 120p)`)

      try {
        const gr = await gradeMatch(match.id)
        if (gr) {
          results.push(`🏆 Chấm điểm: ${gr.wins} thắng, ${gr.losses} thua, ${gr.skipped} bỏ lỡ`)
          if (gr.newlyGraded > 0 && match.scoreHome != null && match.scoreAway != null) {
            const n = await notifyMatchResults(
              match.id, match.homeTeam, match.awayTeam, match.scoreHome, match.scoreAway,
            ).catch(() => 0)
            results.push(`📲 Thông báo cho ${n} người`)
          }
        }
      } catch (e) {
        results.push(`❌ Lỗi chấm điểm: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // ── 4. Tự tăng minute cho trận live ──
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
    finished: shouldFinish.length,
    liveUpdated: liveMatches.length,
    staleWarnings: staleLive.length,
    log: results,
  })
}
