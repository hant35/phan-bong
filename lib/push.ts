import webpush from "web-push"
import { prisma } from "./db"

function initVapid() {
  const { VAPID_EMAIL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env
  if (!VAPID_EMAIL || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false
  try {
    webpush.setVapidDetails(VAPID_EMAIL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    return true
  } catch (err) {
    // Key sai định dạng (không phải URL-safe Base64) — bỏ qua push thay vì crash
    console.warn("[push] VAPID keys không hợp lệ, bỏ qua gửi push:", (err as Error).message)
    return false
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, url = "/") {
  if (!initVapid()) return
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  const payload = JSON.stringify({ title, body, url })

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err) => {
        // Xóa subscription hết hạn
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        }
      })
    )
  )
}

export async function sendPushToAll(title: string, body: string, url = "/") {
  if (!initVapid()) return
  const subs = await prisma.pushSubscription.findMany()
  const payload = JSON.stringify({ title, body, url })

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        }
      })
    )
  )
}
