"use client"

import { useEffect } from "react"

// Chạy cron job mỗi 60 giây để tự động chuyển trạng thái trận đấu
// Component này mount 1 lần ở layout, không render gì

export function CronRunner() {
  useEffect(() => {
    // Chạy ngay khi mount
    fetch("/api/cron").catch(() => {})

    // Lặp lại mỗi 60 giây
    const interval = setInterval(() => {
      fetch("/api/cron").catch(() => {})
    }, 60_000)

    return () => clearInterval(interval)
  }, [])

  return null
}
