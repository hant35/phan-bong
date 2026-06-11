import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sendPushToUser } from "@/lib/push"

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const result = await sendPushToUser(
    user.id,
    "🔔 Test thông báo",
    `Xin chào ${user.name}! Push notification đang hoạt động.`,
    "/profile",
  )

  if (!result.configured) {
    return NextResponse.json({ ok: false, error: "Server chưa cấu hình VAPID keys" }, { status: 503 })
  }
  if (result.total === 0) {
    return NextResponse.json({ ok: false, error: "Chưa có thiết bị nào đăng ký" }, { status: 400 })
  }
  if (result.delivered === 0) {
    return NextResponse.json({
      ok: false,
      ...result,
      error: `Gửi thất bại cho tất cả ${result.total} thiết bị (${result.expired} hết hạn, ${result.failed} lỗi). Hãy thử Đăng ký lại.`,
    })
  }

  return NextResponse.json({ ok: true, ...result })
}
