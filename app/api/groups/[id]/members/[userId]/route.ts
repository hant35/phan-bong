import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

type Params = { params: Promise<{ id: string; userId: string }> }

// PATCH — promote/demote thành viên
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { id: groupId, userId: targetId } = await params
  const { role } = await req.json()

  if (!["admin", "member"].includes(role)) {
    return NextResponse.json({ error: "Role không hợp lệ" }, { status: 400 })
  }

  const myMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  })
  if (!myMembership || myMembership.role !== "owner") {
    return NextResponse.json({ error: "Chỉ chủ hội mới được phân quyền admin" }, { status: 403 })
  }

  const target = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: targetId, groupId } },
  })
  if (!target) return NextResponse.json({ error: "Thành viên không tồn tại" }, { status: 404 })
  if (target.role === "owner") return NextResponse.json({ error: "Không thể thay đổi quyền của chủ hội" }, { status: 400 })

  const updated = await prisma.groupMember.update({
    where: { userId_groupId: { userId: targetId, groupId } },
    data: { role },
    include: { user: { select: { name: true } } },
  })

  await prisma.activity.create({
    data: {
      userId: user.id,
      groupId,
      type: "admin",
      action: role === "admin" ? `đã phong admin cho` : `đã thu hồi quyền admin của`,
      target: updated.user.name,
    },
  })

  return NextResponse.json({ role: updated.role })
}

// DELETE — kick thành viên
export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { id: groupId, userId: targetId } = await params

  const myMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  })
  if (!myMembership || (myMembership.role !== "owner" && myMembership.role !== "admin")) {
    return NextResponse.json({ error: "Chỉ admin/chủ hội mới được kick thành viên" }, { status: 403 })
  }

  const target = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: targetId, groupId } },
    include: { user: { select: { name: true } } },
  })
  if (!target) return NextResponse.json({ error: "Thành viên không tồn tại" }, { status: 404 })
  if (target.role === "owner") return NextResponse.json({ error: "Không thể kick chủ hội" }, { status: 400 })
  // Admin không được kick admin khác
  if (myMembership.role === "admin" && target.role === "admin") {
    return NextResponse.json({ error: "Admin không thể kick admin khác" }, { status: 403 })
  }

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: targetId, groupId } },
  })

  await prisma.activity.create({
    data: {
      userId: user.id,
      groupId,
      type: "kick",
      action: "đã kick",
      target: target.user.name,
    },
  })

  return NextResponse.json({ ok: true })
}
