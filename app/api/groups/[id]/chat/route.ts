import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { id: groupId } = await params

  // Chỉ thành viên trong hội mới xem được
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  })
  if (!membership) return NextResponse.json({ error: "Không có quyền" }, { status: 403 })

  const messages = await prisma.groupChat.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    take: 50,
    skip: 0,
    include: { user: { select: { id: true, name: true, avatar: true, displayName: true } } },
  })

  // Lấy 50 tin nhắn cuối
  const last50 = messages.slice(-50)
  return NextResponse.json(last50)
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { id: groupId } = await params
  const { text } = await req.json()

  if (!text?.trim()) return NextResponse.json({ error: "Tin nhắn trống" }, { status: 400 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  })
  if (!membership) return NextResponse.json({ error: "Không có quyền" }, { status: 403 })

  const trimmed = text.trim().slice(0, 500)

  const message = await prisma.groupChat.create({
    data: { userId: user.id, groupId, text: trimmed },
    include: { user: { select: { id: true, name: true, avatar: true, displayName: true } } },
  })

  return NextResponse.json(message)
}
