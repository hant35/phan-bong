import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { randomBytes } from "crypto"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ groups: [] })

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: { group: { include: { _count: { select: { members: true } } } } },
  })

  const groups = await Promise.all(memberships.map(async m => {
    const allMembers = await prisma.groupMember.findMany({
      where: { groupId: m.groupId },
      orderBy: { points: "desc" },
    })
    const myRank = allMembers.findIndex(am => am.userId === user.id) + 1
    return {
      id: m.group.id,
      name: m.group.name,
      visibility: m.group.visibility,
      inviteCode: m.group.inviteCode,
      memberCount: m.group._count.members,
      myRank,
      totalPoints: m.points,
    }
  }))

  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { name, visibility } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Thiếu tên hội" }, { status: 400 })

  const inviteCode = randomBytes(3).toString("hex").toUpperCase()
  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      visibility: visibility === "public" ? "public" : "private",
      inviteCode,
      adminId: user.id,
      members: { create: { userId: user.id } },
    },
  })
  return NextResponse.json({ group })
}
