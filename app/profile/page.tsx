import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getLeaderboardFromGroupPoints, sumUserGroupPoints } from "@/lib/group-points"
import { ProfileView } from "./view"

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const badges = await prisma.badge.findMany()
  const userBadges = await prisma.userBadge.findMany({ where: { userId: user.id } })
  const ownedSet = new Set(userBadges.map(b => b.badgeCode))

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: { group: { select: { id: true, name: true } } },
  })
  const defaultGroupId = user.defaultGroupId ?? memberships[0]?.group.id ?? null

  const predictions = await prisma.prediction.findMany({
    where: { userId: user.id, ...(defaultGroupId ? { groupId: defaultGroupId } : { groupId: "none" }) },
    include: { match: true },
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
  }))

  const [groupPointsSum, leaderboard] = await Promise.all([
    sumUserGroupPoints(user.id),
    getLeaderboardFromGroupPoints(),
  ])
  const myIdx = leaderboard.findIndex(u => u.userId === user.id)
  const aboveMe = myIdx > 0 ? leaderboard[myIdx - 1] : null
  const belowMe = myIdx >= 0 && myIdx < leaderboard.length - 1 ? leaderboard[myIdx + 1] : null

  return <ProfileView
    user={{
      name: user.name, displayName: user.displayName, statusText: user.statusText ?? null, avatar: user.avatar ?? "BN",
      groupPointsSum, streak: user.streak, createdAt: user.createdAt.toISOString(),
      rank: myIdx >= 0 ? myIdx + 1 : leaderboard.length + 1,
      total: predictions.filter(p => p.result === "win" || p.result === "loss").length,
      correct: predictions.filter(p => p.result === "win").length,
    }}
    badges={badges.map(b => ({ ...b, earned: ownedSet.has(b.code) }))}
    statsByType={[
      { type: "Kèo chấp", correct: winsByType.ah?.wins ?? 0, total: winsByType.ah?.total ?? 0, color: "#00e676" },
      { type: "Tổng bàn thắng", correct: winsByType.ou?.wins ?? 0, total: winsByType.ou?.total ?? 0, color: "#00bcd4" },
      { type: "Tỉ số", correct: winsByType.exact?.wins ?? 0, total: winsByType.exact?.total ?? 0, color: "#ffd700" },
      { type: "1X2", correct: winsByType["1x2"]?.wins ?? 0, total: winsByType["1x2"]?.total ?? 0, color: "#7c3aed", disabled: true },
    ]}
    recentPicks={recentPicks}
    rankContext={{
      above: aboveMe ? { name: aboveMe.user.name, avatar: aboveMe.user.avatar ?? "??", points: aboveMe.points, rank: myIdx } : null,
      below: belowMe ? { name: belowMe.user.name, avatar: belowMe.user.avatar ?? "??", points: belowMe.points, rank: myIdx + 2 } : null,
    }}
    groups={memberships.map(m => ({ id: m.group.id, name: m.group.name }))}
    defaultGroupId={defaultGroupId}
    quietHoursEnabled={user.quietHoursEnabled}
  />
}
