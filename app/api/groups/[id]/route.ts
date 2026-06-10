import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getCurrentUser()

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      admin: { select: { id: true, name: true, avatar: true } },
      _count: { select: { members: true } },
    },
  })
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    orderBy: { points: "desc" },
    include: { user: { select: { id: true, name: true, displayName: true, avatar: true, streak: true } } },
  })

  const myRank = user ? members.findIndex(m => m.userId === user.id) + 1 : 0
  const myMembership = user ? members.find(m => m.userId === user.id) : null

  const activities = await prisma.activity.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true, avatar: true } } },
  })

  return NextResponse.json({
    group: {
      id: group.id, name: group.name, visibility: group.visibility, inviteCode: group.inviteCode,
      memberCount: group._count.members,
      admin: group.admin,
      myRank, myPoints: myMembership?.points ?? 0,
      members: members.map((m, i) => ({
        rank: i + 1, userId: m.userId, name: m.user.name, displayName: m.user.displayName,
        avatar: m.user.avatar, streak: m.user.streak, points: m.points,
        isMe: user?.id === m.userId,
      })),
      activities: activities.map(a => ({
        id: a.id, type: a.type, action: a.action, target: a.target,
        user: a.user.name, avatar: a.user.avatar, createdAt: a.createdAt,
      })),
    },
  })
}
