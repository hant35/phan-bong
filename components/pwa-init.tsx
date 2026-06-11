"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell, BellOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react"
import {
  getPushSupportState,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client"

export function PwaInit() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])
  return null
}

type PushState = "idle" | "granted" | "denied" | "loading" | "error" | "resubscribing" | "success"

function supportStateToPushState(state: Awaited<ReturnType<typeof getPushSupportState>>): PushState {
  switch (state) {
    case "subscribed": return "granted"
    case "denied": return "denied"
    case "unsupported": return "denied"
    case "unsubscribed": return "idle"
    default: {
      const _exhaustive: never = state
      return _exhaustive
    }
  }
}

export function PushToggle() {
  const [state, setState] = useState<PushState>("idle")

  useEffect(() => {
    void getPushSupportState().then(s => setState(supportStateToPushState(s)))
  }, [])

  const subscribe = useCallback(async () => {
    setState("loading")
    const result = await subscribeToPush()
    if (result.ok) {
      setState("granted")
      return
    }
    if (result.reason === "denied") {
      setState("denied")
      return
    }
    setState("error")
    setTimeout(() => setState("idle"), 3000)
  }, [])

  async function unsubscribe() {
    setState("loading")
    try {
      await unsubscribeFromPush()
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
  const [subInfo, setSubInfo] = useState<{ endpoint: string } | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const checkSubscription = useCallback(async () => {
    const support = await getPushSupportState()
    if (support === "subscribed") {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setState("granted")
      setSubInfo(sub ? { endpoint: sub.endpoint } : null)
    } else {
      setState(supportStateToPushState(support))
      setSubInfo(null)
    }
  }, [])

  useEffect(() => { void checkSubscription() }, [checkSubscription])

  async function resubscribe() {
    setState("resubscribing")
    setTestResult(null)
    try {
      await unsubscribeFromPush()
      const result = await subscribeToPush({ replaceExisting: false })
      if (!result.ok) {
        if (result.reason === "denied") setState("denied")
        else throw new Error(result.message ?? "Đăng ký thất bại")
        return
      }
      await checkSubscription()
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
    const result = await subscribeToPush({ replaceExisting: false })
    if (result.ok) {
      await checkSubscription()
      setState("success")
      setTimeout(() => setState("granted"), 3000)
      return
    }
    if (result.reason === "denied") {
      setState("denied")
      return
    }
    setState("error")
    setTestResult({ ok: false, msg: result.message ?? "Đăng ký thất bại" })
    setTimeout(() => { setState("idle"); setTestResult(null) }, 5000)
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
      await unsubscribeFromPush()
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

      {state === "success" && (
        <div className="flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold"
          style={{ background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)", color: "#00e676" }}>
          <CheckCircle2 size={14} />
          Đăng ký thành công! Thiết bị này sẽ nhận push notification.
        </div>
      )}

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

      <div className="flex flex-wrap gap-2">
        {state === "idle" || state === "error" ? (
          <button onClick={() => void subscribe()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "rgba(0,230,118,0.15)", color: "#00e676", border: "1px solid rgba(0,230,118,0.25)" }}>
            <Bell size={13} />
            Bật thông báo
          </button>
        ) : (state === "granted" || state === "success") ? (
          <>
            <button onClick={() => void resubscribe()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(0,188,212,0.12)", color: "#00bcd4", border: "1px solid rgba(0,188,212,0.25)" }}>
              <RefreshCw size={13} />
              Đăng ký lại
            </button>
            <button onClick={() => void sendTestPush()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(255,215,0,0.12)", color: "#ffd700", border: "1px solid rgba(255,215,0,0.25)" }}>
              <Bell size={13} />
              Gửi thử
            </button>
            <button onClick={() => void unsubscribe()}
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
