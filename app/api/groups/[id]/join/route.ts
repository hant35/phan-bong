import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { sendPushToUser } from "@/lib/push"

const JOIN_MSGS = [
  "Thêm một chiến hữu nữa rồi! 🎉",
  "Hội ta có thêm thành viên mới! 🔥",
  "Thành viên mới đã vào hội — cạnh tranh thêm rồi! 😈",
  "Đón chào thành viên mới nào! 🙌",
  "Hội ngày càng đông vui! 🥳",
]

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

  // Lấy danh sách thành viên hiện tại trước khi thêm mới
  const existingMembers = await prisma.groupMember.findMany({
    where: { groupId: group.id },
    select: { userId: true },
  })

  await prisma.groupMember.create({ data: { userId: user.id, groupId: group.id, points: 0 } })
  await prisma.activity.create({
    data: { userId: user.id, groupId: group.id, type: "join", action: "vừa tham gia hội", target: group.name },
  })

  // Gửi push cho tất cả thành viên hiện tại (trừ người mới vào)
  const randomMsg = JOIN_MSGS[Math.floor(Math.random() * JOIN_MSGS.length)]
  await Promise.allSettled(
    existingMembers
      .filter(m => m.userId !== user.id)
      .map(m => sendPushToUser(
        m.userId,
        `👋 ${user.name} vừa vào hội "${group.name}"`,
        randomMsg,
        `/groups/${group.id}`,
      ))
  )

  return NextResponse.json({ group: { id: group.id, name: group.name } })
}
