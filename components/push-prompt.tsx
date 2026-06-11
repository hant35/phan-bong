"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, X } from "lucide-react"
import { getPushSupportState, subscribeToPush } from "@/lib/push-client"

const DISMISS_KEY = "pb_push_prompt_dismissed"

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const evaluate = useCallback(async () => {
    if (localStorage.getItem(DISMISS_KEY)) return
    if (!localStorage.getItem("pb_onboarded")) return

    const me = await fetch("/api/auth/me").then(r => r.json()).catch(() => ({ user: null }))
    if (!me.user) return

    const state = await getPushSupportState()
    if (state !== "unsubscribed") return

    setVisible(true)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void evaluate() }, 1200)

    function onOnboarded() {
      window.setTimeout(() => { void evaluate() }, 800)
    }
    window.addEventListener("pb_onboarded", onOnboarded)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("pb_onboarded", onOnboarded)
    }
  }, [evaluate])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1")
    setVisible(false)
  }

  async function allow() {
    setLoading(true)
    const result = await subscribeToPush()
    setLoading(false)

    if (result.ok) {
      localStorage.setItem(DISMISS_KEY, "1")
      setVisible(false)
      return
    }
    if (result.reason === "denied") dismiss()
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-20 md:bottom-6 z-[150] px-4 pointer-events-none">
      <div
        className="pointer-events-auto mx-auto max-w-md rounded-2xl p-4 shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #1a1d28 0%, #0f1117 100%)",
          border: "1px solid rgba(0,230,118,0.2)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex gap-3">
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,230,118,0.15)" }}
          >
            <Bell size={18} className="text-[#00e676]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white mb-0.5">Bật thông báo?</p>
            <p className="text-xs text-white/50 leading-relaxed">
              Nhận tin khi có trận mới, kết quả chấm điểm, hoặc hoạt động trong hội.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => void allow()}
                disabled={loading}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-[#0f1117] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}
              >
                {loading ? "Đang bật..." : "Cho phép"}
              </button>
              <button
                onClick={dismiss}
                disabled={loading}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white/40 hover:text-white/60 transition-colors disabled:opacity-50"
              >
                Để sau
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            disabled={loading}
            className="shrink-0 p-1 rounded-lg text-white/25 hover:text-white/50 transition-colors self-start disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
