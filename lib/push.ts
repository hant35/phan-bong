import webpush from "web-push"
import { prisma } from "./db"
import type { PushPayload } from "./push-payload"
import { normalizeVapidKey } from "./vapid"

export type PushDeliveryResult = {
  delivered: number
  failed: number
  expired: number
  total: number
  configured: boolean
  debug?: string
}

const isProd = process.env.NODE_ENV === "production"
let vapidReady = false
let vapidChecked = false
let vapidError: string | null = null
let vapidMisconfigAlerted = false

function maskEndpoint(endpoint: string): string {
  if (!isProd) return endpoint.slice(0, 60)
  try {
    const host = new URL(endpoint).hostname
    return `${host}:…${endpoint.slice(-8)}`
  } catch {
    return `…${endpoint.slice(-8)}`
  }
}

function pushLog(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const entry = meta ? { message, ...meta } : { message }
  if (level === "error") console.error("[push]", entry)
  else if (level === "warn") console.warn("[push]", entry)
  else if (!isProd) console.log("[push]", entry)
}

function logPushMetrics(context: string, result: PushDeliveryResult) {
  const metrics = {
    event: "push_delivery",
    context,
    delivered: result.delivered,
    failed: result.failed,
    expired: result.expired,
    total: result.total,
    configured: result.configured,
    ts: new Date().toISOString(),
  }
  if (!result.configured) {
    if (!vapidMisconfigAlerted) {
      vapidMisconfigAlerted = true
      pushLog("error", "ALERT: VAPID chưa cấu hình — push không hoạt động", metrics)
    }
    return
  }
  pushLog("info", "metrics", metrics)
}

function initVapid(): boolean {
  if (vapidChecked) return vapidReady
  vapidChecked = true

  const { VAPID_EMAIL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env

  if (!isProd) {
    pushLog("info", "VAPID config check", {
      hasEmail: !!VAPID_EMAIL,
      hasPublicKey: !!NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      hasPrivateKey: !!VAPID_PRIVATE_KEY,
    })
  }

  if (!VAPID_EMAIL || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    vapidError = `Thiếu env: ${[
      !VAPID_EMAIL && "VAPID_EMAIL",
      !NEXT_PUBLIC_VAPID_PUBLIC_KEY && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      !VAPID_PRIVATE_KEY && "VAPID_PRIVATE_KEY",
    ].filter(Boolean).join(", ")}`
    pushLog("warn", vapidError)
    return false
  }
  try {
    const publicKey = normalizeVapidKey(NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    const privateKey = normalizeVapidKey(VAPID_PRIVATE_KEY)
    webpush.setVapidDetails(VAPID_EMAIL, publicKey, privateKey)
    vapidReady = true
    if (!isProd) pushLog("info", "VAPID configured")
    return true
  } catch (err) {
    vapidError = `VAPID init error: ${(err as Error).message}`
    pushLog("error", vapidError)
    return false
  }
}

function getVapidError(): string {
  return vapidError ?? "VAPID chưa được khởi tạo"
}

type PushSub = { id: string; endpoint: string; p256dh: string; auth: string }

async function deliverToSubscriptions(
  subs: PushSub[],
  payload: PushPayload,
  context: string,
): Promise<PushDeliveryResult> {
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
    logPushMetrics(context, result)
    return result
  }

  if (subs.length === 0) {
    result.debug = "Không có subscription nào"
    return result
  }

  const payloadJson = JSON.stringify(payload)

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadJson,
        )
        result.delivered++
      } catch (err) {
        const e = err as { statusCode?: number; body?: string; message?: string }
        if (e.statusCode === 410 || e.statusCode === 404) {
          result.expired++
          pushLog("warn", "Subscription hết hạn", { endpoint: maskEndpoint(sub.endpoint), statusCode: e.statusCode })
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          result.failed++
          pushLog("error", "Gửi thất bại", {
            statusCode: e.statusCode,
            message: e.message,
            endpoint: maskEndpoint(sub.endpoint),
            ...(isProd ? {} : { body: typeof e.body === "string" ? e.body.slice(0, 200) : e.body }),
          })
        }
      }
    }),
  )

  result.debug = `delivered=${result.delivered} failed=${result.failed} expired=${result.expired} total=${result.total}`
  logPushMetrics(context, result)
  return result
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<PushDeliveryResult> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  return deliverToSubscriptions(subs, payload, `user:${userId}`)
}

export async function sendPushToAll(payload: PushPayload): Promise<PushDeliveryResult> {
  const subs = await prisma.pushSubscription.findMany()
  return deliverToSubscriptions(subs, payload, "broadcast")
}

/** Tương thích test route — title/body/url đơn giản. */
export async function sendPushToUserSimple(
  userId: string,
  title: string,
  body: string,
  url = "/",
): Promise<PushDeliveryResult> {
  return sendPushToUser(userId, { title, body, url, tag: "test" })
}
