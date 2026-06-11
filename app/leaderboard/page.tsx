import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getLeaderboardFromGroupPoints } from "@/lib/group-points"
import { LeaderboardView } from "./view"

export default async function LeaderboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const rows = await getLeaderboardFromGroupPoints()

  const board = rows.map((row, i) => ({
    rank: i + 1,
    userId: row.userId,
    name: row.user.name,
    displayName: row.user.displayName ?? "",
    avatar: row.user.avatar ?? "??",
    points: row.points,
    streak: row.user.streak,
    correct: row.user.predictions.filter(p => p.result === "win").length,
    total: row.user.predictions.filter(p => p.result === "win" || p.result === "loss").length,
    trend: 0,
    badges: row.user.badges.map(b => b.badge.emoji),
    isMe: user.id === row.userId,
  }))

  return <LeaderboardView leaderboard={board} />
}
