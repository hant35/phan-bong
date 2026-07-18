/*
 * Insert 2 trận cuối WC 2026:
 *   - Tranh 3-4: Anh vs Pháp, 18/7/2026 17:00 UTC, Hard Rock Stadium
 *   - Chung kết: Argentina vs Tây Ban Nha, 19/7/2026 19:00 UTC, MetLife Stadium
 *
 * Chạy: DATABASE_URL=... npx tsx scripts/insert-final-matches.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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
  for (const m of FINAL_MATCHES) {
    const existing = await prisma.match.findFirst({
      where: {
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        stage: m.stage,
      },
    })
    if (existing) {
      console.log(`✅ Đã tồn tại: ${m.homeTeam} vs ${m.awayTeam} (${m.stage}) — id=${existing.id}`)
      continue
    }
    const created = await prisma.match.create({ data: { ...m, status: "scheduled" } })
    console.log(`🆕 Đã tạo: ${m.homeTeam} vs ${m.awayTeam} (${m.stage}) — id=${created.id} kickoff=${m.kickoffAt.toISOString()}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
