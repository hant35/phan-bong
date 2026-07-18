/*
 * Insert 2 trận cuối WC 2026:
 *   - Tranh hạng ba: Anh vs Pháp, 18/7/2026 17:00 UTC, Hard Rock Stadium
 *   - Chung kết: Argentina vs Tây Ban Nha, 19/7/2026 19:00 UTC, MetLife Stadium
 *
 * Idempotent: skip nếu đã tồn tại (theo homeTeam+awayTeam+stage).
 * Chạy tự động trong build script (npm run build).
 * Không throw để tránh làm hỏng build nếu DB tạm không kết nối được.
 */
import { PrismaClient } from "@prisma/client"

const FINAL_MATCHES = [
  {
    homeTeam: "Anh",
    awayTeam: "Pháp",
    homeFlag: "gb-eng",
    awayFlag: "fr",
    homeColor: "#CF081F",
    awayColor: "#002395",
    kickoffAt: new Date("2026-07-18T17:00:00Z"),
    stage: "Tranh hạng ba",
    venue: "Hard Rock Stadium, Miami",
  },
  {
    homeTeam: "Argentina",
    awayTeam: "Tây Ban Nha",
    homeFlag: "ar",
    awayFlag: "es",
    homeColor: "#74ACDF",
    awayColor: "#AA151B",
    kickoffAt: new Date("2026-07-19T19:00:00Z"),
    stage: "Chung kết",
    venue: "MetLife Stadium, New York",
  },
]

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("⏭️  insert-final-matches: bỏ qua (không có DATABASE_URL)")
    return
  }
  const prisma = new PrismaClient()
  try {
    for (const m of FINAL_MATCHES) {
      const existing = await prisma.match.findFirst({
        where: { homeTeam: m.homeTeam, awayTeam: m.awayTeam, stage: m.stage },
      })
      if (existing) {
        console.log(`✅ Đã tồn tại: ${m.homeTeam} vs ${m.awayTeam} (${m.stage})`)
        continue
      }
      const created = await prisma.match.create({ data: { ...m, status: "scheduled" } })
      console.log(`🆕 Đã tạo: ${m.homeTeam} vs ${m.awayTeam} (${m.stage}) — id=${created.id}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Không throw — build không fail nếu script lỗi (DB tạm down, v.v.)
main().catch(e => {
  console.error("⚠️  insert-final-matches lỗi (không chặn build):", e instanceof Error ? e.message : e)
})
