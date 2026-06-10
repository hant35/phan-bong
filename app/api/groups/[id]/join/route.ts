import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { inviteCode } = await req.json()
  if (!inviteCode) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 })

  const group = await prisma.group.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } })
  if (!group) return NextResponse.json({ error: "Mã không hợp lệ" }, { status: 404 })

  const exists = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
  })
  if (exists) return NextResponse.json({ error: "Bạn đã trong hội này" }, { status: 409 })

  await prisma.groupMember.create({ data: { userId: user.id, groupId: group.id, points: user.totalPoints } })
  await prisma.activity.create({
    data: { userId: user.id, groupId: group.id, type: "join", action: "vừa tham gia hội", target: group.name },
  })
  return NextResponse.json({ group: { id: group.id, name: group.name } })
}
