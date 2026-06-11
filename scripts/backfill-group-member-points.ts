/**
 * Backfill GroupMember.points = 100 + sum(Prediction.points) theo từng hội.
 * Chạy một lần sau khi chuyển sang mô hình ví theo hội.
 *
 *   npx tsx scripts/backfill-group-member-points.ts
 */
import { prisma } from "../lib/db"
import { GROUP_STARTING_POINTS } from "../lib/group-points"
import { clampPoints } from "../lib/hope-star"

async function main() {
  const members = await prisma.groupMember.findMany({ select: { userId: true, groupId: true, points: true } })
  let updated = 0

  for (const m of members) {
    const agg = await prisma.prediction.aggregate({
      where: { userId: m.userId, groupId: m.groupId, result: { not: null } },
      _sum: { points: true },
    })
    const deltaSum = agg._sum.points ?? 0
    const next = clampPoints(GROUP_STARTING_POINTS, deltaSum)

    if (next !== m.points) {
      await prisma.groupMember.update({
        where: { userId_groupId: { userId: m.userId, groupId: m.groupId } },
        data: { points: next },
      })
      updated++
    }
  }

  console.log(`✅ Backfill xong: ${updated}/${members.length} membership được cập nhật.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
