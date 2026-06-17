import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { PublicProfileView } from "./view"

export default async function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const me = await getCurrentUser()
  if (!me) redirect("/login")

  // Nếu xem profile của chính mình thì redirect về /profile
  if (userId === me.id) redirect("/profile")

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, displayName: true, statusText: true, avatar: true, streak: true, createdAt: true },
  })
  if (!target) notFound()

  // Chỉ cho xem nếu cùng hội
  const sharedGroup = await prisma.groupMember.findFirst({
    where: {
      groupId: { in: (await prisma.groupMember.findMany({ where: { userId: me.id }, select: { groupId: true } })).map(m => m.groupId) },
      userId: target.id,
    },
    select: { groupId: true },
  })
  if (!sharedGroup && me.role !== "admin") notFound()

  const badges = await prisma.badge.findMany()
  const userBadges = await prisma.userBadge.findMany({ where: { userId: target.id } })
  const ownedSet = new Set(userBadges.map(b => b.badgeCode))

  const predictions = await prisma.prediction.findMany({
    where: { userId: target.id },
    include: { match: true, group: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  const winsByType: Record<string, { wins: number; total: number }> = {}
  for (const p of predictions) {
    if (!winsByType[p.betType]) winsByType[p.betType] = { wins: 0, total: 0 }
    if (p.result === "win" || p.result === "loss") {
      winsByType[p.betType].total++
      if (p.result === "win") winsByType[p.betType].wins++
    }
  }

  const recentPicks = predictions.slice(0, 5).map(p => ({
    id: p.id,
    match: `${p.match.homeTeam} vs ${p.match.awayTeam}`,
    homeFlag: p.match.homeFlag, awayFlag: p.match.awayFlag,
    pickLabel: p.betType === "exact" ? `Tỉ số ${p.homeScore}-${p.awayScore}` :
               p.betType === "ou" ? (p.side === "over" ? "Trên" : "Dưới") :
               p.betType === "ah" ? `Chấp → ${p.side === "home" ? p.match.homeTeam : p.match.awayTeam}` :
               `1X2 → ${p.side === "home" ? p.match.homeTeam : p.side === "away" ? p.match.awayTeam : "Hòa"}`,
    confidence: p.confidence,
    result: p.result ?? (p.match.status === "live" ? "live" : "pending"),
    points: p.points,
    actualScore: p.match.scoreHome !== null ? `${p.match.scoreHome}-${p.match.scoreAway}` : null,
    groupName: p.group.name,
  }))

  // Điểm trong hội chung
  const memberInSharedGroup = sharedGroup ? await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: target.id, groupId: sharedGroup.groupId } },
    select: { points: true, wins: true, losses: true, skipped: true },
  }) : null

  return <PublicProfileView
    user={{
      id: target.id,
      name: target.name,
      displayName: target.displayName,
      statusText: target.statusText ?? null,
      avatar: target.avatar ?? "??",
      streak: target.streak,
      createdAt: target.createdAt.toISOString(),
      total: predictions.filter(p => p.result === "win" || p.result === "loss").length,
      correct: predictions.filter(p => p.result === "win").length,
      groupPoints: memberInSharedGroup?.points ?? null,
      groupWins: memberInSharedGroup?.wins ?? null,
      groupLosses: memberInSharedGroup?.losses ?? null,
    }}
    badges={badges.map(b => ({ ...b, earned: ownedSet.has(b.code) }))}
    statsByType={[
      { type: "Kèo chấp", correct: winsByType.ah?.wins ?? 0, total: winsByType.ah?.total ?? 0, color: "#00e676" },
      { type: "Tổng bàn", correct: winsByType.ou?.wins ?? 0, total: winsByType.ou?.total ?? 0, color: "#00bcd4" },
      { type: "Tỉ số", correct: winsByType.exact?.wins ?? 0, total: winsByType.exact?.total ?? 0, color: "#ffd700" },
    ]}
    recentPicks={recentPicks}
  />
}
