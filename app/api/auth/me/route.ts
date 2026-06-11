import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sumUserGroupPoints } from "@/lib/group-points"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null })
  const groupPointsSum = await sumUserGroupPoints(user.id)
  return NextResponse.json({
    user: {
      id: user.id, email: user.email, name: user.name, avatar: user.avatar,
      groupPointsSum, streak: user.streak, displayName: user.displayName,
    },
  })
}
