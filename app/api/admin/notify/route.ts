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
    const result = await sendPushToAll(title.trim(), body.trim(), url || "/")
    if (!result.configured) {
      return NextResponse.json({ error: `Chưa cấu hình VAPID keys trên server. ${result.debug ?? ""}`, ...result }, { status: 503 })
    }
    if (result.total === 0) {
      return NextResponse.json({ error: "Chưa có thiết bị đăng ký nhận thông báo", ...result }, { status: 400 })
    }
    return NextResponse.json({
      ok: result.delivered > 0,
      ...result,
      error: result.delivered === 0
        ? `Không gửi được. ${result.debug ?? ""}`
        : undefined,
    })
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

    const results = await Promise.all(
      members.map(m => sendPushToUser(m.userId, title.trim(), body.trim(), url || `/groups/${groupId}`)),
    )
    const aggregated = results.reduce(
      (acc, r) => ({
        delivered: acc.delivered + r.delivered,
        failed: acc.failed + r.failed,
        expired: acc.expired + r.expired,
        total: acc.total + r.total,
        configured: acc.configured && r.configured,
      }),
      { delivered: 0, failed: 0, expired: 0, total: 0, configured: true },
    )
    if (!aggregated.configured) {
      return NextResponse.json({ error: "Chưa cấu hình VAPID keys trên server" }, { status: 503 })
    }
    if (aggregated.total === 0) {
      return NextResponse.json({ error: "Không có thành viên nào bật thông báo" }, { status: 400 })
    }
    return NextResponse.json({
      ok: aggregated.delivered > 0,
      ...aggregated,
      error: aggregated.delivered === 0
        ? "Không gửi được thông báo. Kiểm tra VAPID keys (public/private cùng cặp; đổi NEXT_PUBLIC_VAPID_PUBLIC_KEY cần deploy lại)."
        : undefined,
    })
  }

  return NextResponse.json({ error: "target không hợp lệ" }, { status: 400 })
}
