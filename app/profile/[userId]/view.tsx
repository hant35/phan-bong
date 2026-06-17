"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Award, TrendingUp, Target, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { flagUrl, timeAgo } from "@/lib/format"

interface Props {
  user: {
    id: string; name: string; displayName: string | null; statusText: string | null
    avatar: string; streak: number; createdAt: string
    total: number; correct: number
    groupPoints: number | null; groupWins: number | null; groupLosses: number | null
  }
  badges: { code: string; name: string; emoji: string; description: string; earned: boolean }[]
  statsByType: { type: string; correct: number; total: number; color: string }[]
  recentPicks: { id: string; match: string; homeFlag: string; awayFlag: string; pickLabel: string; confidence: number; result: string; points: number; actualScore: string | null }[]
}

const avatarGradients = [
  "linear-gradient(135deg, #ffd700, #ff8f00)",
  "linear-gradient(135deg, #b0bec5, #78909c)",
  "linear-gradient(135deg, #7c3aed, #ec4899)",
  "linear-gradient(135deg, #0288d1, #26c6da)",
  "linear-gradient(135deg, #00e676, #00bcd4)",
]

export function PublicProfileView({ user, badges, statsByType, recentPicks }: Props) {
  const [tab, setTab] = useState<"overview" | "badges" | "history">("overview")
  const winRate = user.total > 0 ? Math.round(user.correct / user.total * 100) : 0
  const earnedBadges = badges.filter(b => b.earned)

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <Link href="javascript:history.back()" className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors">
        <ArrowLeft size={15} /> Quay lại
      </Link>

      {/* Header card */}
      <div className="rounded-3xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
            style={{ background: avatarGradients[user.name.length % avatarGradients.length], color: "#0f1117" }}>
            {user.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-white text-lg leading-tight">{user.name}</div>
            {user.displayName && <div className="text-sm text-white/50">{user.displayName}</div>}
            {user.statusText && <div className="text-xs text-white/40 mt-1 italic">"{user.statusText}"</div>}
            <div className="text-[11px] text-white/25 mt-1">Tham gia {timeAgo(user.createdAt)}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Tỉ lệ đúng", value: `${winRate}%`, color: "#00e676" },
            { label: "Tổng trận", value: user.total, color: "#00bcd4" },
            { label: "Streak", value: user.streak > 0 ? `🔥${user.streak}` : "—", color: "#ffd700" },
            { label: "Điểm hội", value: user.groupPoints ?? "—", color: "#ec4899" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[9px] text-white/30 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
        {(["overview", "badges", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("flex-1 py-2 text-xs font-bold rounded-xl transition-all", tab === t ? "text-white" : "text-white/30")}
            style={tab === t ? { background: "rgba(255,255,255,0.08)" } : {}}>
            {t === "overview" ? "Thống kê" : t === "badges" ? `🏅 Huy hiệu (${earnedBadges.length})` : "Lịch sử"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          {statsByType.map(s => (
            <div key={s.type} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{s.type}</div>
                <div className="text-xs text-white/40">{s.correct}/{s.total} đúng</div>
              </div>
              <div className="text-lg font-black" style={{ color: s.color }}>
                {s.total > 0 ? `${Math.round(s.correct / s.total * 100)}%` : "—"}
              </div>
            </div>
          ))}
          {user.groupPoints !== null && (
            <div className="rounded-2xl p-4 grid grid-cols-3 gap-2 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div className="text-lg font-black" style={{ color: "#00e676" }}>{user.groupWins}</div>
                <div className="text-[10px] text-white/30">Thắng</div>
              </div>
              <div>
                <div className="text-lg font-black" style={{ color: "#ff5252" }}>{user.groupLosses}</div>
                <div className="text-[10px] text-white/30">Thua</div>
              </div>
              <div>
                <div className="text-lg font-black" style={{ color: "#ec4899" }}>{user.groupPoints}</div>
                <div className="text-[10px] text-white/30">Xu trong hội</div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "badges" && (
        <div className="grid grid-cols-2 gap-2">
          {badges.filter(b => b.earned).map(b => (
            <div key={b.code} className="rounded-2xl p-3 flex items-start gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,215,0,0.15)" }}>
              <div className="text-2xl">{b.emoji}</div>
              <div>
                <div className="text-sm font-black text-white">{b.name}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{b.description}</div>
              </div>
            </div>
          ))}
          {earnedBadges.length === 0 && (
            <div className="col-span-2 text-center py-8 text-white/30 text-sm">Chưa có huy hiệu nào</div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {recentPicks.map(p => (
            <div key={p.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-1 flex-shrink-0">
                <img src={flagUrl(p.homeFlag)} className="w-5 h-3.5 rounded object-cover" alt="" />
                <img src={flagUrl(p.awayFlag)} className="w-5 h-3.5 rounded object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{p.match}</div>
                <div className="text-[10px] text-white/40">{p.pickLabel}</div>
              </div>
              <div className={cn("text-xs font-black px-2 py-0.5 rounded-lg",
                p.result === "win" ? "text-[#00e676]" : p.result === "loss" ? "text-[#ff5252]" : "text-white/30"
              )}>
                {p.result === "win" ? `+${p.points}` : p.result === "loss" ? `${p.points}` : "—"}
              </div>
            </div>
          ))}
          {recentPicks.length === 0 && (
            <div className="text-center py-8 text-white/30 text-sm">Chưa có lịch sử dự đoán</div>
          )}
        </div>
      )}
    </div>
  )
}
