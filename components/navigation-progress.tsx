"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const prevPath = useRef(pathname + searchParams.toString())

  // Khi route thay đổi → ẩn bar
  useEffect(() => {
    const current = pathname + searchParams.toString()
    if (current !== prevPath.current) {
      prevPath.current = current
      setProgress(100)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
    }
  }, [pathname, searchParams])

  // Bắt click trên link → hiện bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a")
      if (!target) return
      const href = target.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto")) return
      if (target.getAttribute("target") === "_blank") return

      setVisible(true)
      setProgress(15)

      // Fake progress
      let p = 15
      function tick() {
        p += Math.random() * 12
        if (p >= 85) { setProgress(85); return }
        setProgress(p)
        rafRef.current = requestAnimationFrame(() => {
          timerRef.current = setTimeout(tick, 200 + Math.random() * 300)
        })
      }
      timerRef.current = setTimeout(tick, 200)
    }

    document.addEventListener("click", handleClick)
    return () => {
      document.removeEventListener("click", handleClick)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] transition-all"
      style={{
        width: `${progress}%`,
        background: "linear-gradient(90deg, #00e676, #00bcd4)",
        transitionDuration: progress === 100 ? "200ms" : "400ms",
        transitionTimingFunction: "ease",
        boxShadow: "0 0 8px rgba(0,230,118,0.6)",
      }}
    />
  )
}
