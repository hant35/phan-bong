import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ROUND_ORDER = ["Vòng bảng", "Vòng 32", "Vòng 16", "Tứ kết", "Bán kết", "Tranh hạng ba", "Chung kết"]
const canonicalRound = (stage) => (stage.split(" · ")[0] || stage).trim()

try {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, displayName: true },
    orderBy: { name: "asc" },
  })

  const preds = await prisma.prediction.findMany({
    select: {
      userId: true,
      result: true,
      betType: true,
      match: { select: { stage: true, status: true } },
    },
  })

  // stats[userId][round] = { win, loss, skip, pending }
  const stats = {}
  for (const u of users) {
    stats[u.id] = {}
    for (const r of ROUND_ORDER) stats[u.id][r] = { win: 0, loss: 0, skip: 0, pending: 0 }
  }

  for (const p of preds) {
    const round = canonicalRound(p.match.stage)
    if (!stats[p.userId]?.[round]) continue
    const bucket = stats[p.userId][round]
    if (p.betType === "skip") bucket.skip++
    else if (p.result === "win") bucket.win++
    else if (p.result === "loss") bucket.loss++
    else bucket.pending++
  }

  // Print CSV-like table
  const nameW = 24
  const cellW = 22
  const header = "User".padEnd(nameW) + ROUND_ORDER.map(r => r.padEnd(cellW)).join("") + "TỔNG"
  console.log(header)
  console.log("-".repeat(header.length))

  const rows = []
  for (const u of users) {
    let totW = 0, totL = 0, totS = 0
    const cells = ROUND_ORDER.map(r => {
      const s = stats[u.id][r]
      totW += s.win; totL += s.loss; totS += s.skip
      const cell = `${s.win}Đ ${s.loss}S ${s.skip}B` + (s.pending > 0 ? ` (${s.pending}?)` : "")
      return cell.padEnd(cellW)
    }).join("")
    const total = `${totW}Đ ${totL}S ${totS}B`
    rows.push({ user: u, line: u.name.padEnd(nameW) + cells + total, totW, totL, totS })
  }

  // Sort by total wins desc for readability
  rows.sort((a, b) => (b.totW - a.totW) || (a.totL - b.totL))
  for (const r of rows) console.log(r.line)

  console.log("\nChú thích: Đ = Đúng · S = Sai · B = Bỏ · (n?) = chưa chấm\n")

  // Also emit JSON summary
  const summary = users.map(u => ({
    userId: u.id,
    name: u.name,
    displayName: u.displayName,
    byRound: Object.fromEntries(ROUND_ORDER.map(r => [r, stats[u.id][r]])),
  }))
  const fs = await import("node:fs/promises")
  await fs.writeFile("scripts/user-stats-by-round.json", JSON.stringify(summary, null, 2))
  console.log("→ Đã ghi file JSON chi tiết: scripts/user-stats-by-round.json")
} finally {
  await prisma.$disconnect()
}
