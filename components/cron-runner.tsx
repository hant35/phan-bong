"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

// ══════════════════════════════════════════════════════════════
// CronRunner — refresh nhẹ UI khi người dùng quay lại tab/app.
// Sync/chấm điểm chạy bằng server cron để không lộ endpoint tốn quota.
// ══════════════════════════════════════════════════════════════

export function CronRunner() {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let mounted = true

    function refreshIfVisible() {
      if (!mounted) return
      if (document.visibilityState === "visible") router.refresh()
    }

    function schedule() {
      timerRef.current = setTimeout(() => {
        refreshIfVisible()
        schedule()
      }, 60_000)
    }

    document.addEventListener("visibilitychange", refreshIfVisible)
    schedule()

    return () => {
      mounted = false
      document.removeEventListener("visibilitychange", refreshIfVisible)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [router])

  return null
}
