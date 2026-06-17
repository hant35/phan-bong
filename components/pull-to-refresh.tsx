"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

const THRESHOLD = 72  // px kéo để trigger
const MAX_PULL = 100  // px tối đa hiển thị

export function PullToRefresh() {
  const router = useRouter()
  const [pullY, setPullY] = useState(0)       // 0..MAX_PULL
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)
  const pullingRef = useRef(false)

  useEffect(() => {
    const scrollTop = () => (document.getElementById("main-scroll")?.scrollTop ?? window.scrollY)

    const onTouchStart = (e: TouchEvent) => {
      // Chỉ bắt đầu kéo khi đang ở đầu trang
      if (scrollTop() > 0) return
      startYRef.current = e.touches[0].clientY
      pullingRef.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return
      if (scrollTop() > 0) { startYRef.current = null; return }

      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) return

      pullingRef.current = true
      // Easing: kháng lực khi kéo xa
      const clamped = Math.min(MAX_PULL, dy * 0.45)
      setPullY(clamped)
      if (dy > 10) e.preventDefault()
    }

    const onTouchEnd = async () => {
      if (!pullingRef.current) return
      startYRef.current = null
      pullingRef.current = false

      if (pullY >= THRESHOLD) {
        setRefreshing(true)
        setPullY(THRESHOLD * 0.6)
        router.refresh()
        await new Promise(r => setTimeout(r, 800))
        setRefreshing(false)
      }
      setPullY(0)
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: false })
    document.addEventListener("touchend", onTouchEnd)
    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [pullY, router])

  if (pullY === 0 && !refreshing) return null

  const progress = Math.min(1, pullY / THRESHOLD)
  const ready = pullY >= THRESHOLD || refreshing

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center pointer-events-none"
      style={{ height: pullY || (refreshing ? THRESHOLD * 0.6 : 0), transition: pullY === 0 ? "height 0.25s ease" : "none" }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: ready ? "linear-gradient(135deg,#00e676,#00bcd4)" : "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          transform: `scale(${0.6 + progress * 0.4})`,
          transition: "background 0.15s, transform 0.1s",
        }}
      >
        {refreshing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ready ? "#0f1117" : "#fff"} strokeWidth="2.5"
            strokeLinecap="round" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ready ? "#0f1117" : "rgba(255,255,255,0.6)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: `rotate(${progress * 180}deg)`, transition: "transform 0.1s" }}>
            <path d="M12 5v14M5 12l7-7 7 7" />
          </svg>
        )}
      </div>
    </div>
  )
}
