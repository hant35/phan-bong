import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/notifications — lấy tất cả notifications của user hiện tại
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  })

  return NextResponse.json({ notifications, unreadCount })
}

// PATCH /api/notifications — đánh dấu đọc
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, readAll } = await req.json()

  if (readAll) {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
  } else if (id) {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    })
  }

  return NextResponse.json({ ok: true })
}
