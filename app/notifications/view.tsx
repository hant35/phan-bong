"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Notification {
  id: string; type: string; title: string; body: string; read: boolean; matchId: string | null; createdAt: string
}

const TYPE_EMOJI: Record<string, string> = {
  kickoff_soon: "⏰",
  kickoff: "⚽",
  goal: "⚽",
  result: "📊",
  streak: "🔥",
  overtaken: "📈",
  badge: "🏅",
  prediction: "🎯",
  join: "👋",
  config: "⚙️",
  admin: "📢",
  welcome: "👋",
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "vừa xong"
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

export function NotificationsView({ notifications: initial }: { notifications: Notification[] }) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initial)
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  async function markAllRead() {
    setMarkingAll(true)
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readAll: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setMarkingAll(false)
  }

  async function handleClick(n: Notification) {
    // Mark as read
    if (!n.read) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      })
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
    // Navigate to match if available
    if (n.matchId) {
      router.push(`/matches/${n.matchId}`)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-white">Thông báo</h1>
          {unreadCount > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(0,230,118,0.15)", color: "#00e676" }}>
              {unreadCount} mới
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} disabled={markingAll}
            className="text-xs font-semibold transition-colors hover:text-white/60"
            style={{ color: "#00e676" }}>
            {markingAll ? "Đang xử lý..." : "Đọc hết"}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-sm font-medium">Chưa có thông báo</p>
          <p className="text-xs mt-1">Đi đoán trận đi, sẽ có thông báo thôi!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <button key={n.id} onClick={() => handleClick(n)}
              className={cn("w-full rounded-2xl p-4 transition-all text-left", n.matchId && "hover:scale-[1.01]")}
              style={!n.read
                ? { background: "rgba(0,230,118,0.05)", border: "1px solid rgba(0,230,118,0.12)" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  {TYPE_EMOJI[n.type] ?? "📢"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-bold", n.read ? "text-white/50" : "text-white")}>
                    {n.title}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-[10px] text-white/40 mt-1.5">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#00e676" }} />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
