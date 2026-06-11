export type PushSupportState = "unsupported" | "denied" | "subscribed" | "unsubscribed"

export function normalizeVapidPublicKey(key: string): string {
  return key.trim().replace(/^["']|["']$/g, "").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function getPushSupportState(): Promise<PushSupportState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported"
  if (!("Notification" in window)) return "unsupported"
  if (Notification.permission === "denied") return "denied"

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub && Notification.permission === "granted") return "subscribed"
    return "unsubscribed"
  } catch {
    return "unsubscribed"
  }
}

export async function subscribeToPush(options?: { replaceExisting?: boolean }): Promise<
  { ok: true } | { ok: false; reason: "denied" | "unsupported" | "error"; message?: string }
> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { ok: false, reason: "unsupported" }
  }

  try {
    const perm = await Notification.requestPermission()
    if (perm !== "granted") return { ok: false, reason: "denied" }

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing && options?.replaceExisting !== false) {
      await existing.unsubscribe()
    }

    const vapidPublicKey = normalizeVapidPublicKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "")
    if (!vapidPublicKey) return { ok: false, reason: "error", message: "Thiếu NEXT_PUBLIC_VAPID_PUBLIC_KEY" }

    const rawKey = urlBase64ToUint8Array(vapidPublicKey)
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: rawKey.buffer.slice(rawKey.byteOffset, rawKey.byteOffset + rawKey.byteLength) as ArrayBuffer,
    })

    const j = sub.toJSON()
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: j.keys }),
    })
    if (!res.ok) return { ok: false, reason: "error", message: "Server từ chối đăng ký" }

    return { ok: true }
  } catch (err) {
    return { ok: false, reason: "error", message: (err as Error).message }
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  })
  await sub.unsubscribe()
}
