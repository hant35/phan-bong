import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"

// POST /api/admin/matches/seed-finals
// Seed 2 trận cuối WC 2026 nếu chưa có (idempotent). Admin trigger thủ công.
export async function POST() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const FINAL_MATCHES = [
    {
      homeTeam: "Anh", awayTeam: "Pháp",
      homeFlag: "gb-eng", awayFlag: "fr",
      homeColor: "#CF081F", awayColor: "#002395",
      kickoffAt: new Date("2026-07-18T17:00:00Z"),
      stage: "Tranh hạng ba", venue: "Hard Rock Stadium, Miami",
    },
    {
      homeTeam: "Argentina", awayTeam: "Tây Ban Nha",
      homeFlag: "ar", awayFlag: "es",
      homeColor: "#74ACDF", awayColor: "#AA151B",
      kickoffAt: new Date("2026-07-19T19:00:00Z"),
      stage: "Chung kết", venue: "MetLife Stadium, New York",
    },
  ]

  const results: { match: string; stage: string; action: "created" | "exists"; id?: string }[] = []
  for (const m of FINAL_MATCHES) {
    const existing = await prisma.match.findFirst({
      where: { homeTeam: m.homeTeam, awayTeam: m.awayTeam, stage: m.stage },
      select: { id: true },
    })
    if (existing) {
      results.push({ match: `${m.homeTeam} vs ${m.awayTeam}`, stage: m.stage, action: "exists", id: existing.id })
      continue
    }
    const created = await prisma.match.create({ data: { ...m, status: "scheduled" } })
    results.push({ match: `${m.homeTeam} vs ${m.awayTeam}`, stage: m.stage, action: "created", id: created.id })
  }
  return NextResponse.json({ ok: true, results })
}
