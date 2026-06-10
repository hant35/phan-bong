"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send, Smile, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMessage {
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

export function GroupChat({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [showPicker, setShowPicker] = useState<false | "emoji" | "sticker">(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/chat`)
      if (res.ok) setMessages(await res.json())
    } catch {}
  }, [groupId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  async function send(message?: string) {
    const msg = (message ?? text).trim()
    if (!msg || sending) return
    setSending(true)
    setText("")
    setShowPicker(false)
    try {
      const res = await fetch(`/api/groups/${groupId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg }),
      })
      if (res.ok) {
        const newMsg = await res.json()
        setMessages(prev => [...prev.slice(-49), newMsg])
      }
    } catch {}
    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <MessageCircle size={15} className="text-[#00e676]" />
          <span className="font-bold text-white text-sm">Chat hội</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(0,230,118,0.12)", color: "#00e676" }}>
            {messages.length}
          </span>
        </div>
        <div className="flex -space-x-1.5">
          {[...new Map(messages.map(m => [m.user.id, m])).values()].slice(0, 5).map(m => (
            <div key={m.user.id}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black ring-1 ring-[#0f1117]"
              style={{ background: avatarGradients[m.user.name.length % avatarGradients.length], color: "white" }}>
              {m.user.avatar ?? "?"}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto hide-scrollbar px-4 py-3 space-y-0.5"
        style={{ height: "min(380px, 48vh)" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/15 py-8">
            <div className="text-5xl mb-3">🗣️</div>
            <p className="text-sm font-bold">Chưa có ai nói gì</p>
            <p className="text-xs mt-1 text-white/20">Hãy là người phá vỡ sự im lặng! 😏</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.user.id === currentUserId
            const showAvatar = i === 0 || messages[i - 1].user.id !== msg.user.id
            const isConsecutive = i > 0 && messages[i - 1].user.id === msg.user.id
            const isEmojiOnly = /^[\p{Emoji}\s]+$/u.test(msg.text) && msg.text.length <= 8

            return (
              <div key={msg.id}
                className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row", !isConsecutive ? "mt-3" : "mt-0.5")}>
                <div className="w-7 flex-shrink-0">
                  {showAvatar && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black"
                      style={{ background: avatarGradients[msg.user.name.length % avatarGradients.length], color: "white" }}>
                      {msg.user.avatar ?? "??"}
                    </div>
                  )}
                </div>
                <div className={cn("max-w-[75%]", isMe ? "items-end" : "items-start")}>
                  {showAvatar && !isMe && (
                    <div className="text-[10px] font-bold text-white/30 mb-0.5 ml-1">
                      {msg.user.name.split(" ").slice(-2).join(" ")}
                    </div>
                  )}
                  {isEmojiOnly ? (
                    <div className="text-3xl leading-tight px-1">{msg.text}</div>
                  ) : (
                    <div className={cn("rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                        isMe ? "rounded-tr-md" : "rounded-tl-md")}
                      style={isMe
                        ? { background: "rgba(0,230,118,0.15)", color: "#e0ffe8" }
                        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" }}>
                      {msg.text}
                    </div>
                  )}
                  <div className={cn("text-[9px] text-white/15 mt-0.5", isMe ? "text-right mr-1" : "ml-1")}>
                    {timeAgo(msg.createdAt)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Emoji / Sticker picker */}
      {showPicker && (
        <div className="px-4 py-2 overflow-x-auto hide-scrollbar"
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
                  <div className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1">{pack.label}</div>
                  <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                    {pack.stickers.map(s => (
                      <button key={s} onClick={() => send(s)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold text-white/70 transition-all hover:scale-105"
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

      {/* Input */}
      <div className="px-4 py-3 flex items-center gap-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <button onClick={() => setShowPicker(showPicker === "emoji" ? false : "emoji")}
          className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
            showPicker === "emoji" ? "bg-[#00e676]/15" : "hover:bg-white/5")}>
          <Smile size={18} className={showPicker === "emoji" ? "text-[#00e676]" : "text-white/30"} />
        </button>
        <button onClick={() => setShowPicker(showPicker === "sticker" ? false : "sticker")}
          className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors text-sm",
            showPicker === "sticker" ? "bg-[#00e676]/15" : "hover:bg-white/5")}>
          <span className={showPicker === "sticker" ? "text-[#00e676]" : "text-white/30"}>🏷️</span>
        </button>
        <div className="flex-1">
          <input ref={inputRef}
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            onFocus={() => setShowPicker(false)}
            placeholder="Nói gì đó với hội..."
            maxLength={500}
            className="w-full h-10 rounded-xl px-4 text-sm text-white placeholder:text-white/20 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
        <button onClick={() => send()} disabled={!text.trim() || sending}
          className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
            text.trim() ? "hover:scale-105 active:scale-95" : "opacity-30")}
          style={{ background: text.trim() ? "linear-gradient(135deg, #00e676, #00bcd4)" : "rgba(255,255,255,0.04)" }}>
          <Send size={16} className={text.trim() ? "text-[#0f1117]" : "text-white/20"} />
        </button>
      </div>
    </div>
  )
}
