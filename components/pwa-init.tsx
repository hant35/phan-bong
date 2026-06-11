"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"

export function PwaInit() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])
  return null
}

export function PushToggle() {
  const [state, setState] = useState<"idle" | "granted" | "denied" | "loading">("idle")

  useEffect(() => {
    if (!("Notification" in window)) { setState("denied"); return }
    if (Notification.permission === "granted") setState("granted")
    else if (Notification.permission === "denied") setState("denied")
  }, [])

  async function subscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    setState("loading")
    try {
      const perm = await Notification.requestPermission()
      if (perm !== "granted") { setState("denied"); return }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const vapidPublicKey = normalizeVapidPublicKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      if (!vapidPublicKey) throw new Error("Thiếu NEXT_PUBLIC_VAPID_PUBLIC_KEY")
      const rawKey = urlBase64ToUint8Array(vapidPublicKey)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: rawKey.buffer.slice(rawKey.byteOffset, rawKey.byteOffset + rawKey.byteLength) as ArrayBuffer,
      })

      const j = sub.toJSON()
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: j.keys }),
      })
      setState("granted")
    } catch {
      setState("idle")
    }
  }

  async function unsubscribe() {
    setState("loading")
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState("idle")
    } catch {
      setState("granted")
    }
  }

  if (state === "denied") return null

  return (
    <button
      onClick={state === "granted" ? unsubscribe : subscribe}
      disabled={state === "loading"}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
      style={state === "granted"
        ? { background: "rgba(0,230,118,0.12)", color: "#00e676", border: "1px solid rgba(0,230,118,0.2)" }
        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }
      }
      title={state === "granted" ? "Tắt thông báo" : "Bật thông báo"}
    >
      {state === "granted" ? <Bell size={13} /> : <BellOff size={13} />}
      {state === "granted" ? "Thông báo bật" : "Bật thông báo"}
    </button>
  )
}

function normalizeVapidPublicKey(key: string): string {
  return key.trim().replace(/^["']|["']$/g, "").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
