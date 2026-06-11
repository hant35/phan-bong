import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { syncFootballData } from "@/lib/sync-sources"

// ══════════════════════════════════════════════════════════════
// GET /api/sync — Lightweight auto-sync endpoint
// Client gọi mỗi 20s khi có trận live, 5 phút khi không có
// ══════════════════════════════════════════════════════════════

export async function GET() {
  const fdKey = process.env.FOOTBALL_DATA_API_KEY
  if (!fdKey) {
    return NextResponse.json({ ok: false, error: "No API key configured" }, { status: 500 })
  }

  // Kiểm tra có trận live/scheduled sắp đá không
  const now = new Date()
  const liveCount = await prisma.match.count({ where: { status: "live" } })
  const soonCount = await prisma.match.count({
    where: {
      status: "scheduled",
      kickoffAt: { lte: new Date(now.getTime() + 30 * 60 * 1000) }, // trong 30 phút tới
    },
  })

  // Suggest interval cho client: 20s khi có trận live/sắp đá, 300s khi idle
  const hasAction = liveCount > 0 || soonCount > 0
  const nextInterval = hasAction ? 20 : 300

  try {
    const result = await syncFootballData(fdKey)
    return NextResponse.json({
      ok: true,
      updated: result.updated,
      liveCount,
      soonCount,
      nextInterval,
      details: result.details.filter(d =>
        d.startsWith("🏆") || d.startsWith("📲") || d.includes("→") || d.includes("score")
      ),
      errors: result.errors,
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      nextInterval,
    }, { status: 500 })
  }
}
