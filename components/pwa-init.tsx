"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell, BellOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react"

export function PwaInit() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])
  return null
}

type PushState = "idle" | "granted" | "denied" | "loading" | "error" | "resubscribing" | "success"

export function PushToggle() {
  const [state, setState] = useState<PushState>("idle")

  useEffect(() => {
    if (!("Notification" in window)) { setState("denied"); return }
    if (Notification.permission === "granted") setState("granted")
    else if (Notification.permission === "denied") setState("denied")
  }, [])

  const subscribe = useCallback(async () => {
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
      setState("error")
      setTimeout(() => setState("idle"), 3000)
    }
  }, [])

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

  const isError = state === "error"

  return (
    <button
      onClick={state === "granted" ? unsubscribe : subscribe}
      disabled={state === "loading" || isError}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
      style={isError
        ? { background: "rgba(255,82,82,0.12)", color: "#ff5252", border: "1px solid rgba(255,82,82,0.2)" }
        : state === "granted"
        ? { background: "rgba(0,230,118,0.12)", color: "#00e676", border: "1px solid rgba(0,230,118,0.2)" }
        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }
      }
      title={isError ? "Bật thông báo thất bại" : state === "granted" ? "Tắt thông báo" : "Bật thông báo"}
    >
      {isError ? <BellOff size={13} /> : state === "granted" ? <Bell size={13} /> : <BellOff size={13} />}
      {isError ? "Thất bại!" : state === "granted" ? "Thông báo bật" : "Bật thông báo"}
    </button>
  )
}

/** Panel chi tiết push — dùng trong trang Profile */
export function PushSettingsPanel() {
  const [state, setState] = useState<PushState>("idle")
  const [subInfo, setSubInfo] = useState<{ endpoint: string; createdAt?: string } | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const checkSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("denied")
      return
    }
    if (!("Notification" in window) || Notification.permission === "denied") {
      setState("denied")
      return
    }
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub && Notification.permission === "granted") {
        setState("granted")
        setSubInfo({ endpoint: sub.endpoint })
      } else {
        setState("idle")
        setSubInfo(null)
      }
    } catch {
      setState("idle")
    }
  }, [])

  useEffect(() => { checkSubscription() }, [checkSubscription])

  async function resubscribe() {
    setState("resubscribing")
    setTestResult(null)
    try {
      const reg = await navigator.serviceWorker.ready

      // 1. Hủy subscription cũ
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        })
        await existing.unsubscribe()
      }

      // 2. Đăng ký mới
      const perm = await Notification.requestPermission()
      if (perm !== "granted") { setState("denied"); return }

      const vapidPublicKey = normalizeVapidPublicKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      if (!vapidPublicKey) throw new Error("Thiếu VAPID key")
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

      if (!res.ok) throw new Error("Server từ chối đăng ký")

      setSubInfo({ endpoint: sub.endpoint })
      setState("success")
      setTimeout(() => setState("granted"), 3000)
    } catch (err) {
      setState("error")
      setTestResult({ ok: false, msg: (err as Error).message })
      setTimeout(() => { setState("idle"); setTestResult(null) }, 5000)
    }
  }

  async function subscribe() {
    setState("loading")
    setTestResult(null)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== "granted") { setState("denied"); return }

      const reg = await navigator.serviceWorker.ready
      const vapidPublicKey = normalizeVapidPublicKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      if (!vapidPublicKey) throw new Error("Thiếu VAPID key")
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
      if (!res.ok) throw new Error("Server từ chối đăng ký")

      setSubInfo({ endpoint: sub.endpoint })
      setState("success")
      setTimeout(() => setState("granted"), 3000)
    } catch (err) {
      setState("error")
      setTestResult({ ok: false, msg: (err as Error).message })
      setTimeout(() => { setState("idle"); setTestResult(null) }, 5000)
    }
  }

  async function sendTestPush() {
    setTestResult(null)
    try {
      const res = await fetch("/api/push/test", { method: "POST" })
      const data = await res.json()
      if (res.ok && data.ok) {
        setTestResult({ ok: true, msg: `Đã gửi thành công (${data.delivered}/${data.total} thiết bị)` })
      } else {
        setTestResult({ ok: false, msg: data.error || "Gửi thất bại" })
      }
    } catch {
      setTestResult({ ok: false, msg: "Lỗi kết nối" })
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
      setSubInfo(null)
      setTestResult(null)
    } catch {
      setState("granted")
    }
  }

  const endpointShort = subInfo?.endpoint
    ? subInfo.endpoint.replace(/^https:\/\//, "").slice(0, 50) + "..."
    : null

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Bell size={14} className="text-[#00e676]" />
          Push Notification
        </h3>
        <div className="flex items-center gap-1.5">
          {(state === "granted" || state === "success") ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(0,230,118,0.15)", color: "#00e676" }}>
              Đang bật
            </span>
          ) : state === "denied" ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,82,82,0.15)", color: "#ff5252" }}>
              Bị chặn
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
              Chưa bật
            </span>
          )}
        </div>
      </div>

      {/* Status info */}
      {state === "denied" && (
        <div className="rounded-xl p-3 text-xs text-white/50 space-y-1" style={{ background: "rgba(255,82,82,0.06)", border: "1px solid rgba(255,82,82,0.12)" }}>
          <p className="font-semibold text-[#ff5252]">Trình duyệt đã chặn thông báo</p>
          <p>Vào Cài đặt trình duyệt → Quyền → Thông báo → Cho phép trang này.</p>
        </div>
      )}

      {endpointShort && (state === "granted" || state === "success") && (
        <div className="text-[10px] text-white/30 font-mono truncate">
          📡 {endpointShort}
        </div>
      )}

      {/* Success message */}
      {state === "success" && (
        <div className="flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold"
          style={{ background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)", color: "#00e676" }}>
          <CheckCircle2 size={14} />
          Đăng ký thành công! Thiết bị này sẽ nhận push notification.
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold`}
          style={testResult.ok
            ? { background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)", color: "#00e676" }
            : { background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.2)", color: "#ff5252" }
          }>
          {testResult.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {testResult.msg}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {state === "idle" || state === "error" ? (
          <button onClick={subscribe}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "rgba(0,230,118,0.15)", color: "#00e676", border: "1px solid rgba(0,230,118,0.25)" }}>
            <Bell size={13} />
            Bật thông báo
          </button>
        ) : (state === "granted" || state === "success") ? (
          <>
            <button onClick={resubscribe}
              disabled={state === ("resubscribing" as string)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              style={{ background: "rgba(0,188,212,0.12)", color: "#00bcd4", border: "1px solid rgba(0,188,212,0.25)" }}>
              <RefreshCw size={13} className={state === ("resubscribing" as string) ? "animate-spin" : ""} />
              {state === ("resubscribing" as string) ? "Đang đăng ký lại..." : "Đăng ký lại"}
            </button>
            <button onClick={sendTestPush}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(255,215,0,0.12)", color: "#ffd700", border: "1px solid rgba(255,215,0,0.25)" }}>
              <Bell size={13} />
              Gửi thử
            </button>
            <button onClick={unsubscribe}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(255,82,82,0.08)", color: "#ff5252", border: "1px solid rgba(255,82,82,0.15)" }}>
              <BellOff size={13} />
              Tắt
            </button>
          </>
        ) : state === "loading" || state === "resubscribing" ? (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <RefreshCw size={13} className="animate-spin" />
            Đang xử lý...
          </div>
        ) : null}
      </div>
    </div>
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
