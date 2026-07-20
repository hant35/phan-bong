import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ROUND_ORDER, canonicalRound } from "@/lib/rounds"
import { GroupStatsView } from "./view"

export default async function GroupStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!group) notFound()

  // Chỉ thành viên hội hoặc admin hệ thống được xem
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: id } },
    select: { userId: true },
  })
  if (!membership && user.role !== "admin") notFound()

  const [members, predictions] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId: id },
      include: { user: { select: { id: true, name: true, displayName: true, avatar: true } } },
      orderBy: { points: "desc" },
    }),
    prisma.prediction.findMany({
      where: { groupId: id },
      select: {
        userId: true,
        result: true,
        betType: true,
        match: { select: { stage: true, status: true } },
      },
    }),
  ])

  // stats[userId][round] = { wins, losses, skips, pending }
  const stats: Record<string, Record<string, { wins: number; losses: number; skips: number; pending: number }>> = {}
  for (const m of members) {
    stats[m.userId] = {}
    for (const r of ROUND_ORDER) stats[m.userId][r] = { wins: 0, losses: 0, skips: 0, pending: 0 }
  }
  for (const p of predictions) {
    const round = canonicalRound(p.match.stage)
    const bucket = stats[p.userId]?.[round]
    if (!bucket) continue
    if (p.betType === "skip") bucket.skips++
    else if (p.result === "win") bucket.wins++
    else if (p.result === "loss") bucket.losses++
    else bucket.pending++
  }

  // Chỉ hiển thị các vòng đã có ít nhất 1 prediction (win/loss/skip) trong hội
  const activeRounds = ROUND_ORDER.filter(r =>
    members.some(m => {
      const s = stats[m.userId][r]
      return s.wins + s.losses + s.skips > 0
    })
  )

  const rows = members.map(m => {
    const byRound = Object.fromEntries(activeRounds.map(r => [r, stats[m.userId][r]]))
    let totalW = 0, totalL = 0, totalS = 0
    for (const r of activeRounds) {
      totalW += stats[m.userId][r].wins
      totalL += stats[m.userId][r].losses
      totalS += stats[m.userId][r].skips
    }
    const graded = totalW + totalL
    return {
      userId: m.userId,
      name: m.user.name,
      displayName: m.user.displayName,
      avatar: m.user.avatar ?? "??",
      isMe: m.userId === user.id,
      byRound,
      totals: {
        wins: totalW,
        losses: totalL,
        skips: totalS,
        graded,
        winRate: graded > 0 ? Math.round(totalW / graded * 100) : 0,
      },
    }
  })

  return <GroupStatsView
    groupId={group.id}
    groupName={group.name}
    rounds={activeRounds}
    rows={rows}
  />
}
