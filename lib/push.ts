import webpush from "web-push"
import { prisma } from "./db"
import { normalizeVapidKey } from "./vapid"

export type PushDeliveryResult = {
  delivered: number
  failed: number
  expired: number
  total: number
  configured: boolean
}

let vapidReady = false
let vapidChecked = false

function initVapid(): boolean {
  if (vapidChecked) return vapidReady
  vapidChecked = true

  const { VAPID_EMAIL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env
  if (!VAPID_EMAIL || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[push] Thiếu VAPID_EMAIL / NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY")
    return false
  }
  try {
    const publicKey = normalizeVapidKey(NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    const privateKey = normalizeVapidKey(VAPID_PRIVATE_KEY)
    webpush.setVapidDetails(VAPID_EMAIL, publicKey, privateKey)
    vapidReady = true
    return true
  } catch (err) {
    console.warn("[push] VAPID keys không hợp lệ, bỏ qua gửi push:", (err as Error).message)
    return false
  }
}

type PushSub = { id: string; endpoint: string; p256dh: string; auth: string }

async function deliverToSubscriptions(subs: PushSub[], payload: string): Promise<PushDeliveryResult> {
  const result: PushDeliveryResult = {
    delivered: 0,
    failed: 0,
    expired: 0,
    total: subs.length,
    configured: initVapid(),
  }
  if (!result.configured || subs.length === 0) return result

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        result.delivered++
      } catch (err) {
        const e = err as { statusCode?: number; body?: string; message?: string }
        if (e.statusCode === 410 || e.statusCode === 404) {
          result.expired++
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          result.failed++
          console.error("[push] Gửi thất bại:", {
            statusCode: e.statusCode,
            body: e.body,
            message: e.message,
            endpoint: sub.endpoint.slice(0, 80),
          })
        }
      }
    }),
  )

  return result
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = "/",
): Promise<PushDeliveryResult> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  return deliverToSubscriptions(subs, JSON.stringify({ title, body, url }))
}

export async function sendPushToAll(
  title: string,
  body: string,
  url = "/",
): Promise<PushDeliveryResult> {
  const subs = await prisma.pushSubscription.findMany()
  return deliverToSubscriptions(subs, JSON.stringify({ title, body, url }))
}
