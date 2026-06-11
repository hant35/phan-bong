import webpush from "web-push"
import { prisma } from "./db"
import { normalizeVapidKey } from "./vapid"

export type PushDeliveryResult = {
  delivered: number
  failed: number
  expired: number
  total: number
  configured: boolean
  debug?: string
}

let vapidReady = false
let vapidChecked = false
let vapidError: string | null = null

function initVapid(): boolean {
  if (vapidChecked) return vapidReady
  vapidChecked = true

  const { VAPID_EMAIL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env

  // Debug: log key presence (not values)
  console.log("[push] VAPID config check:", {
    hasEmail: !!VAPID_EMAIL,
    hasPublicKey: !!NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    publicKeyLength: NEXT_PUBLIC_VAPID_PUBLIC_KEY?.length ?? 0,
    hasPrivateKey: !!VAPID_PRIVATE_KEY,
    privateKeyLength: VAPID_PRIVATE_KEY?.length ?? 0,
  })

  if (!VAPID_EMAIL || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    vapidError = `Thiếu env: ${[
      !VAPID_EMAIL && "VAPID_EMAIL",
      !NEXT_PUBLIC_VAPID_PUBLIC_KEY && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      !VAPID_PRIVATE_KEY && "VAPID_PRIVATE_KEY",
    ].filter(Boolean).join(", ")}`
    console.warn("[push]", vapidError)
    return false
  }
  try {
    const publicKey = normalizeVapidKey(NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    const privateKey = normalizeVapidKey(VAPID_PRIVATE_KEY)
    console.log("[push] Normalized keys:", {
      publicKeyLength: publicKey.length,
      privateKeyLength: privateKey.length,
      publicKeyPrefix: publicKey.slice(0, 10) + "...",
    })
    webpush.setVapidDetails(VAPID_EMAIL, publicKey, privateKey)
    vapidReady = true
    console.log("[push] ✅ VAPID configured successfully")
    return true
  } catch (err) {
    vapidError = `VAPID init error: ${(err as Error).message}`
    console.error("[push]", vapidError)
    return false
  }
}

function getVapidError(): string {
  return vapidError ?? "VAPID chưa được khởi tạo"
}

type PushSub = { id: string; endpoint: string; p256dh: string; auth: string }

async function deliverToSubscriptions(subs: PushSub[], payload: string): Promise<PushDeliveryResult> {
  const configured = initVapid()
  const result: PushDeliveryResult = {
    delivered: 0,
    failed: 0,
    expired: 0,
    total: subs.length,
    configured,
  }

  if (!configured) {
    result.debug = getVapidError()
    console.warn("[push] Bỏ qua gửi push:", result.debug)
    return result
  }

  if (subs.length === 0) {
    result.debug = "Không có subscription nào"
    return result
  }

  console.log(`[push] Đang gửi tới ${subs.length} thiết bị...`)

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        result.delivered++
        console.log("[push] ✅ Gửi OK:", sub.endpoint.slice(0, 60))
      } catch (err) {
        const e = err as { statusCode?: number; body?: string; message?: string }
        if (e.statusCode === 410 || e.statusCode === 404) {
          result.expired++
          console.warn("[push] ⚠️ Subscription hết hạn (410/404):", sub.endpoint.slice(0, 60))
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          result.failed++
          console.error("[push] ❌ Gửi thất bại:", {
            statusCode: e.statusCode,
            body: typeof e.body === "string" ? e.body.slice(0, 200) : e.body,
            message: e.message,
            endpoint: sub.endpoint.slice(0, 80),
          })
        }
      }
    }),
  )

  const summary = `delivered=${result.delivered} failed=${result.failed} expired=${result.expired} total=${result.total}`
  console.log(`[push] Kết quả: ${summary}`)
  result.debug = summary

  return result
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = "/",
): Promise<PushDeliveryResult> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  console.log(`[push] sendPushToUser userId=${userId} subs=${subs.length} title="${title}"`)
  return deliverToSubscriptions(subs, JSON.stringify({ title, body, url }))
}

export async function sendPushToAll(
  title: string,
  body: string,
  url = "/",
): Promise<PushDeliveryResult> {
  const subs = await prisma.pushSubscription.findMany()
  console.log(`[push] sendPushToAll subs=${subs.length} title="${title}"`)
  return deliverToSubscriptions(subs, JSON.stringify({ title, body, url }))
}
