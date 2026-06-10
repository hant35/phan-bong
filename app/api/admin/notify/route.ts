import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { sendPushToUser, sendPushToAll } from "@/lib/push"

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { title, body, url, groupId, target } = await req.json() as {
    title: string; body: string; url?: string
    groupId?: string; target: "all" | "group"
  }

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Thiếu tiêu đề hoặc nội dung" }, { status: 400 })
  }

  // Super admin gửi cho tất cả
  if (target === "all") {
    if (user.role !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    await sendPushToAll(title.trim(), body.trim(), url || "/")
    const total = await prisma.pushSubscription.count()
    return NextResponse.json({ ok: true, sent: total })
  }

  // Admin hội gửi cho thành viên trong hội
  if (target === "group") {
    if (!groupId) return NextResponse.json({ error: "Thiếu groupId" }, { status: 400 })

    const group = await prisma.group.findUnique({ where: { id: groupId } })
    if (!group) return NextResponse.json({ error: "Không tìm thấy hội" }, { status: 404 })

    // Phải là super admin hoặc admin của hội đó
    if (user.role !== "admin" && group.adminId !== user.id) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    })

    await Promise.allSettled(
      members.map(m => sendPushToUser(m.userId, title.trim(), body.trim(), url || `/groups/${groupId}`))
    )
    return NextResponse.json({ ok: true, sent: members.length })
  }

  return NextResponse.json({ error: "target không hợp lệ" }, { status: 400 })
}
