"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send, Smile, ChevronDown, ChevronUp, MessageCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Comment {
  id: string
  text: string
  createdAt: string
  user: { id: string; name: string; avatar: string | null; displayName: string | null }
}

const QUICK_REACTIONS = [
  "🔥", "😂", "💀", "🤡", "👑", "🤦", "⚽", "💪", "😎", "🫡", "😱", "🥶",
]

const STICKER_PACKS = [
  { label: "Trash talk", stickers: [
    "Dễ ăn 🔥", "Kèo thơm 🤑", "All-in! 💰", "Skip thôi 💤",
    "Tui đỉnh nhất 👑", "GG 💀", "Comeback! 💪", "Ez game 😎",
  ]},
  { label: "Reaction", stickers: [
    "GOOOAL! ⚽🎉", "VAR đi! 🖥️", "Penalty! 😱", "Thẻ đỏ! 🟥",
    "Offside! 🚩", "Hết giờ! ⏰", "Hiệp 2 đi! ⚡", "OT! 🔥🔥",
  ]},
]

const avatarGradients = [
  "linear-gradient(135deg, #ffd700, #ff8f00)",
  "linear-gradient(135deg, #7c3aed, #ec4899)",
  "linear-gradient(135deg, #0288d1, #26c6da)",
  "linear-gradient(135deg, #00e676, #00bcd4)",
  "linear-gradient(135deg, #ff5252, #ff1744)",
  "linear-gradient(135deg, #ff9800, #f44336)",
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "vừa xong"
  if (mins < 60) return `${mins}p`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

// ── Floating chat bar (collapsed) ──
export function MatchChatBar({ matchId, currentUserId, commentCount }: {
  matchId: string; currentUserId: string; commentCount: number
}) {
  const [open, setOpen] = useState(false)
  const [latestComment, setLatestComment] = useState<Comment | null>(null)
  const [unread, setUnread] = useState(0)

  // Fetch latest comment for preview
  useEffect(() => {
    fetch(`/api/comments?matchId=${matchId}&limit=1`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (data.length > 0) setLatestComment(data[data.length - 1]) })
      .catch(() => {})
  }, [matchId])

  // Poll for new comments when closed
  useEffect(() => {
    if (open) { setUnread(0); return }
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/comments?matchId=${matchId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.length > commentCount) {
            setUnread(data.length - commentCount)
            setLatestComment(data[data.length - 1])
          }
        }
      } catch {}
    }, 15000)
    return () => clearInterval(interval)
  }, [matchId, commentCount, open])

  if (open) {
    return <MatchChatPanel matchId={matchId} currentUserId={currentUserId} onClose={() => setOpen(false)} />
  }

  return (
    <button onClick={() => { setOpen(true); setUnread(0) }}
      className="w-full rounded-2xl p-3 transition-all hover:scale-[1.01] active:scale-[0.99] text-left"
      style={{ background: "linear-gradient(135deg, rgba(0,230,118,0.08), rgba(0,188,212,0.05))", border: "1px solid rgba(0,230,118,0.15)" }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center relative flex-shrink-0"
          style={{ background: "rgba(0,230,118,0.15)" }}>
          <MessageCircle size={20} className="text-[#00e676]" />
          {(unread > 0 || commentCount > 0) && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-black"
              style={{ background: unread > 0 ? "#ff5252" : "#00e676", color: "#0f1117" }}>
              {unread > 0 ? unread : commentCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Trash Talk</span>
            {unread > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse"
                style={{ background: "rgba(255,82,82,0.2)", color: "#ff5252" }}>
                {unread} mới
              </span>
            )}
          </div>
          {latestComment ? (
            <p className="text-xs text-white/40 truncate mt-0.5">
              <span className="text-white/50 font-semibold">{latestComment.user.name.split(" ").pop()}</span>
              {": "}{latestComment.text}
            </p>
          ) : (
            <p className="text-xs text-white/50 mt-0.5">Bấm để mở chat — hãy là người đầu tiên!</p>
          )}
        </div>
        <ChevronUp size={16} className="text-white/45 flex-shrink-0" />
      </div>
    </button>
  )
}

// ── Full chat panel (expanded) ──
function MatchChatPanel({ matchId, currentUserId, onClose }: {
  matchId: string; currentUserId: string; onClose: () => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [showPicker, setShowPicker] = useState<false | "emoji" | "sticker">(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/comments?matchId=${matchId}`)
    if (res.ok) setComments(await res.json())
  }, [matchId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments.length])

  async function send(message?: string) {
    const msg = (message ?? text).trim()
    if (!msg || sending) return
    setSending(true)
    setText("")
    setShowPicker(false)

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, text: msg }),
    })
    if (res.ok) {
      const newComment = await res.json()
      setComments(prev => [...prev, newComment])
    }
    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(15,17,23,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(0,230,118,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-[#00e676]" />
          <span className="text-sm font-bold text-white">Trash Talk</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(0,230,118,0.15)", color: "#00e676" }}>
            {comments.length}
          </span>
          <div className="flex -space-x-1.5 ml-1">
            {[...new Map(comments.map(c => [c.user.id, c])).values()].slice(0, 4).map((c, i) => (
              <div key={c.user.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black ring-1 ring-[#0f1117]"
                style={{ background: avatarGradients[c.user.name.length % avatarGradients.length], color: "white" }}>
                {c.user.avatar ?? "?"}
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronDown size={16} className="text-white/40" />
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="overflow-y-auto hide-scrollbar px-3 py-2 space-y-0.5"
        style={{ height: "min(400px, 50vh)" }}>
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <div className="text-5xl mb-3">🗣️</div>
            <p className="text-sm font-bold">Im lặng quá!</p>
            <p className="text-xs mt-1 text-white/45">Nói gì đó đi, đừng ngại 😏</p>
          </div>
        ) : (
          comments.map((c, i) => {
            const isMe = c.user.id === currentUserId
            const showAvatar = i === 0 || comments[i - 1].user.id !== c.user.id
            const isConsecutive = i > 0 && comments[i - 1].user.id === c.user.id
            const isEmojiOnly = /^[\p{Emoji}\s]+$/u.test(c.text) && c.text.length <= 8

            return (
              <div key={c.id}
                className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row", !isConsecutive ? "mt-3" : "mt-0.5")}>
                {/* Avatar */}
                <div className="w-7 flex-shrink-0">
                  {showAvatar && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black"
                      style={{ background: avatarGradients[c.user.name.length % avatarGradients.length], color: "white" }}>
                      {c.user.avatar ?? "??"}
                    </div>
                  )}
                </div>
                {/* Bubble */}
                <div className={cn("max-w-[75%]", isMe ? "items-end" : "items-start")}>
                  {showAvatar && !isMe && (
                    <div className="text-[10px] font-bold text-white/30 mb-0.5 ml-1">
                      {c.user.name.split(" ").slice(-2).join(" ")}
                    </div>
                  )}
                  {isEmojiOnly ? (
                    <div className="text-3xl leading-tight px-1">{c.text}</div>
                  ) : (
                    <div className={cn("rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                        isMe ? "rounded-tr-md" : "rounded-tl-md")}
                      style={isMe
                        ? { background: "rgba(0,230,118,0.15)", color: "#e0ffe8" }
                        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" }}>
                      {c.text}
                    </div>
                  )}
                  <div className={cn("text-[9px] text-white/40 mt-0.5", isMe ? "text-right mr-1" : "ml-1")}>
                    {timeAgo(c.createdAt)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Picker */}
      {showPicker && (
        <div className="px-3 py-2 overflow-x-auto hide-scrollbar"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {showPicker === "emoji" && (
            <div className="flex gap-1 flex-wrap">
              {QUICK_REACTIONS.map(e => (
                <button key={e} onClick={() => send(e)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl hover:scale-125 transition-transform hover:bg-white/5">
                  {e}
                </button>
              ))}
            </div>
          )}
          {showPicker === "sticker" && (
            <div className="space-y-2">
              {STICKER_PACKS.map(pack => (
                <div key={pack.label}>
                  <div className="text-[10px] font-bold text-white/45 uppercase tracking-wider mb-1">{pack.label}</div>
                  <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                    {pack.stickers.map(s => (
                      <button key={s} onClick={() => send(s)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold text-white/70 transition-all hover:scale-105 active:scale-95"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-2.5 flex items-center gap-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <button onClick={() => setShowPicker(showPicker === "emoji" ? false : "emoji")}
          className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
            showPicker === "emoji" ? "bg-[#00e676]/15" : "hover:bg-white/5")}
          title="Emoji">
          <Smile size={18} className={showPicker === "emoji" ? "text-[#00e676]" : "text-white/30"} />
        </button>
        <button onClick={() => setShowPicker(showPicker === "sticker" ? false : "sticker")}
          className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors text-sm",
            showPicker === "sticker" ? "bg-[#00e676]/15" : "hover:bg-white/5")}
          title="Sticker">
          <span className={showPicker === "sticker" ? "text-[#00e676]" : "text-white/30"}>🏷️</span>
        </button>
        <div className="flex-1 relative">
          <input ref={inputRef}
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            onFocus={() => setShowPicker(false)}
            placeholder="Nói gì đó..."
            maxLength={500}
            className="w-full h-10 rounded-xl px-4 text-sm text-white placeholder:text-white/45 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
        <button onClick={() => send()} disabled={!text.trim() || sending}
          className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
            text.trim() ? "hover:scale-105 active:scale-95" : "opacity-30")}
          style={{ background: text.trim() ? "linear-gradient(135deg, #00e676, #00bcd4)" : "rgba(255,255,255,0.04)" }}>
          <Send size={16} className={text.trim() ? "text-[#0f1117]" : "text-white/45"} />
        </button>
      </div>
    </div>
  )
}
