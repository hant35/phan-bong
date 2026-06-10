"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Settings, Award, TrendingUp, Target, Flame, Clock, ChevronRight, Sparkles, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { flagUrl } from "@/lib/format"

interface Props {
  user: { name: string; displayName: string | null; avatar: string; totalPoints: number; streak: number; createdAt: string; rank: number; total: number; correct: number }
  badges: { code: string; name: string; emoji: string; description: string; earned: boolean }[]
  statsByType: { type: string; correct: number; total: number; color: string; disabled?: boolean }[]
  recentPicks: { id: string; match: string; homeFlag: string; awayFlag: string; pickLabel: string; confidence: number; result: string; points: number; actualScore: string | null }[]
  rankContext: { above: { name: string; avatar: string; points: number; rank: number } | null; below: { name: string; avatar: string; points: number; rank: number } | null }
}

export function ProfileView({ user, badges, statsByType, recentPicks, rankContext }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<"overview" | "stats" | "badges" | "history">("overview")
  const winRate = user.total > 0 ? Math.round(user.correct / user.total * 100) : 0

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <div>
      <div className="relative rounded-3xl overflow-hidden mb-5" style={{ background: "linear-gradient(135deg, #0d1f2d 0%, #0a2e1a 50%, #1a0e2e 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice">
          <circle cx="300" cy="100" r="60" fill="none" stroke="#00e676" strokeWidth="2"/>
          <circle cx="300" cy="100" r="5" fill="#00e676"/>
          <line x1="300" y1="0" x2="300" y2="200" stroke="#00e676" strokeWidth="1.5"/>
        </svg>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, #00e676 0%, transparent 70%)", transform: "translate(20%, -20%)" }} />
        <div className="relative glass rounded-3xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl"
                style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }}>
                {user.avatar}
              </div>
              <div>
                <h1 className="font-black text-white text-xl">{user.name}</h1>
                {user.displayName && (
                  <div className="inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5"
                    style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)" }}>
                    <span className="text-xs font-bold" style={{ color: "#ffd700" }}>🌙 {user.displayName}</span>
                  </div>
                )}
                <p className="text-xs text-white/50 mt-1">Tham gia từ {new Date(user.createdAt).toLocaleDateString("vi-VN")}</p>
              </div>
            </div>
            <button onClick={logout} className="p-2 rounded-xl hover:bg-white/5 transition-colors" title="Đăng xuất">
              <LogOut size={18} className="text-white/30" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Xu", value: user.totalPoints, gradient: "linear-gradient(135deg, #ffd700, #ff8f00)" },
              { label: "Hạng", value: `#${user.rank}`, gradient: "linear-gradient(135deg, #7c3aed, #ec4899)" },
              { label: "Đúng", value: `${winRate}%`, gradient: "linear-gradient(135deg, #00e676, #00bcd4)" },
              { label: "Streak", value: `${user.streak}🔥`, gradient: "linear-gradient(135deg, #ff5252, #ff8f00)" },
            ].map(({ label, value, gradient }) => (
              <div key={label} className="rounded-2xl p-3 text-center relative overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="absolute bottom-0 inset-x-0 h-0.5" style={{ background: gradient }} />
                <div className="font-black text-xl text-white leading-tight">{value}</div>
                <div className="text-[11px] text-white/30 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
        {[
          { id: "overview", label: "Tổng quan", icon: Sparkles },
          { id: "stats", label: "Thống kê", icon: TrendingUp },
          { id: "badges", label: "Badge", icon: Award },
          { id: "history", label: "Lịch sử", icon: Target },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id as typeof tab)}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all",
              tab === id ? "text-white" : "text-white/50")}
            style={tab === id ? { background: "rgba(255,255,255,0.07)" } : {}}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-bold text-white text-sm mb-4">Cuộc đua bảng vàng</h3>
            <div className="space-y-2">
              {rankContext.above && (
                <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-xs font-black text-white/40 w-6">#{rankContext.above.rank}</span>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black"
                    style={{ background: "linear-gradient(135deg, #0288d1, #26c6da)", color: "white" }}>{rankContext.above.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{rankContext.above.name}</div>
                    <div className="text-[10px] text-white/30">Trên bạn {rankContext.above.points - user.totalPoints} xu</div>
                  </div>
                  <span className="text-sm font-black text-white">{rankContext.above.points}</span>
                </div>
              )}
              <div className="rounded-xl p-3 flex items-center gap-3 ring-1 ring-[#00e676]/30"
                style={{ background: "linear-gradient(135deg, rgba(0,230,118,0.08), rgba(0,188,212,0.05))" }}>
                <span className="text-xs font-black text-[#00e676] w-6">#{user.rank}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black"
                  style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }}>{user.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#00e676] truncate">Bạn</div>
                  <div className="text-[10px] text-white/40">{user.correct}/{user.total} đúng · {winRate}%</div>
                </div>
                <span className="text-sm font-black text-[#00e676]">{user.totalPoints}</span>
              </div>
              {rankContext.below && (
                <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-xs font-black text-white/40 w-6">#{rankContext.below.rank}</span>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black"
                    style={{ background: "linear-gradient(135deg, #ff5252, #ff1744)", color: "white" }}>{rankContext.below.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{rankContext.below.name}</div>
                    <div className="text-[10px] text-white/30">Đuổi bạn — cách {user.totalPoints - rankContext.below.points} xu</div>
                  </div>
                  <span className="text-sm font-black text-white">{rankContext.below.points}</span>
                </div>
              )}
            </div>
          </div>

          {recentPicks.length > 0 && (
            <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2"><Clock size={14} className="text-[#00bcd4]" /> Đoán gần đây</h3>
                <Link href="/history" className="text-[10px] text-white/40 hover:text-white/70 flex items-center gap-0.5">Xem hết <ChevronRight size={10}/></Link>
              </div>
              <div className="space-y-2">
                {recentPicks.map(p => (
                  <div key={p.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="relative w-7 h-5 rounded overflow-hidden"><Image src={flagUrl(p.homeFlag)} alt="" fill className="object-cover" unoptimized/></div>
                      <div className="relative w-7 h-5 rounded overflow-hidden"><Image src={flagUrl(p.awayFlag)} alt="" fill className="object-cover" unoptimized/></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{p.match}</div>
                      <div className="text-[10px] text-white/40 truncate">{p.pickLabel} · CF{p.confidence}{p.actualScore && ` · KQ ${p.actualScore}`}</div>
                    </div>
                    <span className={cn("text-xs font-black px-2 py-0.5 rounded-full",
                      p.result === "win" ? "bg-[#00e676]/15 text-[#00e676]" :
                      p.result === "loss" ? "bg-red-500/15 text-red-400" :
                      p.result === "live" ? "bg-orange-500/15 text-orange-400" :
                      "bg-white/5 text-white/40")}>
                      {p.result === "win" ? `+${p.points}` : p.result === "loss" ? p.points : p.result === "live" ? "LIVE" : "Đang chờ"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "stats" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="font-bold text-white/60 mb-4 text-sm">Tỉ lệ theo loại đoán</h3>
            {statsByType.map(({ type, correct, total, color, disabled }) => (
              <div key={type} className={cn("mb-3", disabled && "opacity-40")}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/50">{type}{disabled && <span className="text-[10px] ml-1 text-white/45">· Sắp ra mắt</span>}</span>
                  <span className="font-bold text-white">{!disabled && total > 0 ? `${correct}/${total} (${Math.round(correct/total*100)}%)` : "—"}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full" style={{ width: !disabled && total > 0 ? `${correct/total*100}%` : "0%", background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "badges" && (
        <div className="grid grid-cols-2 gap-3">
          {badges.map(badge => (
            <div key={badge.code}
              className={cn("rounded-2xl p-4 text-center transition-all", badge.earned ? "" : "opacity-30")}
              style={badge.earned
                ? { background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-3xl mb-2">{badge.emoji}</div>
              <div className={cn("text-sm font-bold mb-1", badge.earned ? "text-white" : "text-white/30")}>{badge.name}</div>
              <p className="text-xs text-white/50">{badge.description}</p>
              {badge.earned && (
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,215,0,0.15)", color: "#ffd700" }}>Đã đạt ✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <Link href="/history" className="block rounded-2xl p-6 text-center hover:bg-white/5 transition-colors"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Target size={32} className="text-white/30 mx-auto mb-2"/>
          <p className="font-bold text-white">Xem toàn bộ lịch sử dự đoán</p>
          <p className="text-xs text-white/30 mt-1">Filter, chart, chi tiết từng trận</p>
        </Link>
      )}
    </div>
  )
}
