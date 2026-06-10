import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  const users = await prisma.user.findMany({
    orderBy: { totalPoints: "desc" },
    include: {
      predictions: { select: { result: true } },
      badges: { include: { badge: true } },
    },
  })

  const board = users.map((u, i) => {
    const correct = u.predictions.filter(p => p.result === "win").length
    const total = u.predictions.length
    return {
      rank: i + 1, userId: u.id, name: u.name, displayName: u.displayName, avatar: u.avatar,
      points: u.totalPoints, streak: u.streak,
      correct, total,
      trend: 0, // TODO: calculate based on history
      badges: u.badges.map(b => b.badge.emoji),
      isMe: user?.id === u.id,
    }
  })
  return NextResponse.json({ leaderboard: board })
}
