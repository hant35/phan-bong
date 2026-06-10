import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { LeaderboardView } from "./view"

export default async function LeaderboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const users = await prisma.user.findMany({
    orderBy: { totalPoints: "desc" },
    include: {
      predictions: { select: { result: true } },
      badges: { include: { badge: true } },
    },
  })

  const board = users.map((u, i) => ({
    rank: i + 1, userId: u.id, name: u.name,
    displayName: u.displayName ?? "",
    avatar: u.avatar ?? "??",
    points: u.totalPoints, streak: u.streak,
    correct: u.predictions.filter(p => p.result === "win").length,
    total: u.predictions.filter(p => p.result === "win" || p.result === "loss").length,
    trend: 0,
    badges: u.badges.map(b => b.badge.emoji),
    isMe: user.id === u.id,
  }))

  return <LeaderboardView leaderboard={board} />
}
