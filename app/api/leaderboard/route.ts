import { NextResponse } from "next/server"
import { getLeaderboardFromGroupPoints } from "@/lib/group-points"

export async function GET() {
  const rows = await getLeaderboardFromGroupPoints()

  return NextResponse.json(rows.map((row, i) => ({
    rank: i + 1,
    userId: row.userId,
    name: row.user.name,
    avatar: row.user.avatar,
    points: row.points,
    streak: row.user.streak,
  })))
}
