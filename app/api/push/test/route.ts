import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sendPushToUserSimple } from "@/lib/push"
import { prisma } from "@/lib/db"

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  // Log subscription count for this user
  const subCount = await prisma.pushSubscription.count({ where: { userId: user.id } })
  console.log(`[push/test] User ${user.name} (${user.id}) has ${subCount} subscriptions`)

  const result = await sendPushToUserSimple(
    user.id,
    "🔔 Test thông báo",
    `Xin chào ${user.name}! Push notification đang hoạt động.`,
    "/profile",
  )

  console.log("[push/test] Result:", JSON.stringify(result))

  if (!result.configured) {
    return NextResponse.json({
      ok: false,
      error: `Server chưa cấu hình VAPID keys đúng. ${result.debug ?? ""}`,
      ...result,
    }, { status: 503 })
  }
  if (result.total === 0) {
    return NextResponse.json({
      ok: false,
      error: "Chưa có thiết bị nào đăng ký cho tài khoản này. Hãy bấm 'Đăng ký lại' trước.",
      ...result,
    }, { status: 400 })
  }
  if (result.delivered === 0) {
    return NextResponse.json({
      ok: false,
      ...result,
      error: `Gửi thất bại ${result.total} thiết bị (${result.expired} hết hạn, ${result.failed} lỗi). ${result.debug ?? ""} — Hãy bấm 'Đăng ký lại' rồi thử lại.`,
    })
  }

  return NextResponse.json({ ok: true, ...result })
}

// GET: check trạng thái push của user hiện tại (không cần gửi)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: user.id },
    select: { id: true, endpoint: true, createdAt: true },
  })

  return NextResponse.json({
    userId: user.id,
    name: user.name,
    subscriptions: subs.map(s => ({
      id: s.id,
      endpoint: s.endpoint.slice(0, 80) + "...",
      createdAt: s.createdAt.toISOString(),
    })),
    total: subs.length,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.slice(0, 15) + "...",
    hasPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
    hasEmail: !!process.env.VAPID_EMAIL,
  })
}
