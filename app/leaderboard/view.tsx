"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Minus, Crown, Flame, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface Entry {
  rank: number; userId: string; name: string; displayName: string; avatar: string;
  points: number; streak: number; correct: number; total: number; trend: number;
  badges: string[]; isMe: boolean;
}

const views = ["Toàn cầu", "Tuần này", "Hội của tôi"]
const avatarGradients = [
  "linear-gradient(135deg, #ffd700, #ff8f00)",
  "linear-gradient(135deg, #b0bec5, #78909c)",
  "linear-gradient(135deg, #cd7f32, #8d4e0b)",
  "linear-gradient(135deg, #7c3aed, #ec4899)",
  "linear-gradient(135deg, #0288d1, #26c6da)",
  "linear-gradient(135deg, #00e676, #00bcd4)",
  "linear-gradient(135deg, #ff5252, #ff1744)",
]

export function LeaderboardView({ leaderboard }: { leaderboard: Entry[] }) {
  const [view, setView] = useState("Toàn cầu")
  const [p1, p2, p3] = leaderboard

  return (
    <div>
      <div className="relative rounded-3xl overflow-hidden mb-6 h-44" style={{
        background: "linear-gradient(135deg, #1a0e2e 0%, #2d1810 50%, #0a1a2e 100%)"
      }}>
        <div className="absolute inset-0 flex items-center justify-end pr-8 opacity-10">
          <svg width="140" height="200" viewBox="0 0 100 140" fill="none">
            <path d="M35 10 h30 v30 c0 25 25 40 25 65 H10 c0-25 25-40 25-65 V10z" fill="#ffd700"/>
            <rect x="42" y="105" width="16" height="20" fill="#ffd700"/>
            <rect x="30" y="125" width="40" height="8" rx="4" fill="#ffd700"/>
          </svg>
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,17,23,0.1) 0%, rgba(15,17,23,0.85) 100%)" }} />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#ffd700" }}>🏅 Bảng vàng</div>
          <h1 className="text-2xl font-black text-white">Ai đang thống trị?</h1>
          <p className="text-white/40 text-sm mt-0.5">FIFA World Cup 2026 · Vòng bảng</p>
        </div>
      </div>

      {/* Podium top 3 */}
      {p1 && p2 && p3 && (
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-end justify-center gap-3">
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black mx-auto mb-2 ring-2 ring-white/10"
                style={{ background: avatarGradients[1], color: "white" }}>{p2.avatar}</div>
              <div className="rounded-t-2xl pt-4 pb-3 px-2 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-2xl mb-1">🥈</div>
                <div className="text-xs font-bold text-white/70 truncate">{p2.name.split(" ").slice(-1)[0]}</div>
                <div className="font-black text-sm mt-1" style={{ color: "#ffd700" }}>{p2.points}</div>
              </div>
            </div>
            <div className="flex-1 text-center" style={{ transform: "translateY(-8px)" }}>
              <Crown size={18} className="mx-auto mb-1.5" style={{ color: "#ffd700" }} />
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-base font-black mx-auto mb-2 shadow-lg"
                style={{ background: avatarGradients[0], color: "white", boxShadow: "0 0 20px rgba(255,215,0,0.3), 0 0 0 2px #ffd700" }}>{p1.avatar}</div>
              <div className="rounded-t-2xl pt-4 pb-3 px-2 text-center" style={{ background: "rgba(255,215,0,0.07)" }}>
                <div className="text-2xl mb-1">🥇</div>
                <div className="text-xs font-bold text-white truncate">{p1.name.split(" ").slice(-1)[0]}</div>
                <div className="font-black text-base mt-1" style={{ color: "#ffd700" }}>{p1.points}</div>
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black mx-auto mb-2 ring-2 ring-white/10"
                style={{ background: avatarGradients[2], color: "white" }}>{p3.avatar}</div>
              <div className="rounded-t-2xl pt-4 pb-3 px-2 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-2xl mb-1">🥉</div>
                <div className="text-xs font-bold text-white/70 truncate">{p3.name.split(" ").slice(-1)[0]}</div>
                <div className="font-black text-sm mt-1" style={{ color: "#ffd700" }}>{p3.points}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
        {views.map(v => (
          <button key={v} onClick={() => setView(v)}
            className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all", view === v ? "text-white" : "text-white/30")}
            style={view === v ? { background: "rgba(255,255,255,0.08)" } : {}}>{v}</button>
        ))}
      </div>

      <div className="space-y-2">
        {leaderboard.map((entry, i) => (
          <div key={entry.userId}
            className={cn("rounded-2xl p-3 flex items-center gap-3", entry.isMe ? "ring-1 ring-[#00e676]/30" : "")}
            style={{ background: entry.isMe ? "linear-gradient(135deg, rgba(0,230,118,0.07), rgba(0,188,212,0.04))" : "rgba(255,255,255,0.03)" }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{
                background: i === 0 ? "linear-gradient(135deg, #ffd700, #ff8f00)"
                  : i === 1 ? "linear-gradient(135deg, #b0bec5, #78909c)"
                  : i === 2 ? "linear-gradient(135deg, #cd7f32, #8d4e0b)"
                  : "rgba(255,255,255,0.06)",
                color: i < 3 ? "#0f1117" : "rgba(255,255,255,0.4)"
              }}>{entry.rank}</div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: avatarGradients[i % avatarGradients.length], color: "white" }}>{entry.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-sm font-bold truncate", entry.isMe ? "text-[#00e676]" : "text-white")}>
                  {entry.isMe ? "Bạn" : entry.name.split(" ").slice(-2).join(" ")}
                </span>
                {entry.streak >= 3 && (
                  <div className="flex items-center gap-0.5 text-orange-400 text-xs">
                    <Flame size={11} /><span className="font-black">{entry.streak}</span>
                  </div>
                )}
                {entry.badges.map((b, j) => <span key={j} className="text-sm">{b}</span>)}
              </div>
              <div className="text-[11px] text-white/25 truncate">{entry.displayName}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={cn("text-base font-black", entry.isMe ? "text-[#00e676]" : "text-white")}>{entry.points}</div>
              <div className="text-[10px] text-white/25">{entry.correct}/{entry.total}</div>
            </div>
            <div className={cn("w-5 flex-shrink-0 flex items-center justify-center",
              entry.trend > 0 ? "text-[#00e676]" : entry.trend < 0 ? "text-red-400" : "text-white/20")}>
              <Minus size={14} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 glass rounded-2xl p-3 flex items-center gap-2">
        <Zap size={14} className="text-[#ffd700] flex-shrink-0" />
        <p className="text-xs text-white/30">
          <strong className="text-white/50">Bảng vàng cập nhật real-time</strong> sau mỗi trận đoán xong.
        </p>
      </div>
    </div>
  )
}
