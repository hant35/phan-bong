"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

// ══════════════════════════════════════════════════════════════
// CronRunner — poll /api/sync mỗi 20s (có trận live) hoặc 5 phút (idle)
// Tự động cập nhật tỉ số, trạng thái, chấm điểm, gửi push
// Refresh UI khi có thay đổi
// ══════════════════════════════════════════════════════════════

export function CronRunner() {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let mounted = true

    async function tick() {
      if (!mounted) return

      let nextDelay = 300_000 // default 5 phút

      try {
        const res = await fetch("/api/sync")
        if (res.ok) {
          const data = await res.json()
          // Server trả về interval gợi ý (giây)
          nextDelay = (data.nextInterval ?? 300) * 1000
          // Refresh UI nếu có thay đổi tỉ số/trạng thái
          if (data.updated > 0) {
            router.refresh()
          }
        }
      } catch {
        // Silent — retry next cycle
      }

      if (mounted) {
        timerRef.current = setTimeout(tick, nextDelay)
      }
    }

    // Bắt đầu sau 3s (không block page load)
    timerRef.current = setTimeout(tick, 3_000)

    return () => {
      mounted = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [router])

  return null
}
