import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { syncFootballData } from "@/lib/sync-sources"

// ══════════════════════════════════════════════════════════════
// GET /api/sync — Auto-sync với debounce
// Dù 100 user gọi cùng lúc, chỉ gọi Football-Data 1 lần mỗi 15s
// ══════════════════════════════════════════════════════════════

// Module-level cache (shared across all requests trong cùng serverless instance)
let lastSyncAt = 0
let lastResult: { updated: number; details: string[]; errors: string[] } | null = null
const DEBOUNCE_MS = 15_000 // Tối thiểu 15s giữa 2 lần gọi API thực

export async function GET() {
  const fdKey = process.env.FOOTBALL_DATA_API_KEY
  if (!fdKey) {
    return NextResponse.json({ ok: false, error: "No API key configured" }, { status: 500 })
  }

  const now = Date.now()
  const liveCount = await prisma.match.count({ where: { status: "live" } })
  const soonCount = await prisma.match.count({
    where: {
      status: "scheduled",
      kickoffAt: { lte: new Date(now + 30 * 60 * 1000) },
    },
  })

  const hasAction = liveCount > 0 || soonCount > 0
  const nextInterval = hasAction ? 20 : 300

  // Debounce: nếu vừa sync trong 15s gần đây → trả kết quả cũ
  if (lastResult && (now - lastSyncAt) < DEBOUNCE_MS) {
    return NextResponse.json({
      ok: true,
      updated: 0, // không có gì mới (cached)
      cached: true,
      liveCount,
      soonCount,
      nextInterval,
      lastSyncAgo: Math.round((now - lastSyncAt) / 1000),
    })
  }

  // Gọi API thực sự
  try {
    const result = await syncFootballData(fdKey)
    lastSyncAt = Date.now()
    lastResult = {
      updated: result.updated,
      details: result.details,
      errors: result.errors,
    }

    return NextResponse.json({
      ok: true,
      updated: result.updated,
      cached: false,
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
