"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Users, Lock, Globe, Crown, Copy, Check, TrendingUp, TrendingDown, Minus, Flame, Activity, Newspaper, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { flagUrl, formatDateTimeParts, timeAgo } from "@/lib/format"

const avatarGradients = [
  "linear-gradient(135deg, #ffd700, #ff8f00)",
  "linear-gradient(135deg, #b0bec5, #78909c)",
  "linear-gradient(135deg, #cd7f32, #8d4e0b)",
  "linear-gradient(135deg, #7c3aed, #ec4899)",
  "linear-gradient(135deg, #0288d1, #26c6da)",
  "linear-gradient(135deg, #00e676, #00bcd4)",
  "linear-gradient(135deg, #ff5252, #ff1744)",
]

const activityColors: Record<string, string> = {
  pick: "#ec4899", win: "#00e676", join: "#00bcd4", badge: "#ffd700",
  loss: "#ff5252", comment: "#7c3aed", rank: "#00e676",
}

interface Group { id: string; name: string; visibility: string; inviteCode: string; memberCount: number; myRank: number; myPoints: number; adminId: string }
interface Member { rank: number; userId: string; name: string; displayName: string; avatar: string; streak: number; points: number; wins: number; losses: number; skipped: number; isMe: boolean; isAdmin: boolean }
interface Activity { id: string; type: string; action: string; target: string; user: string; avatar: string; createdAt: string }
interface UpcomingMatch { id: string; homeTeam: string; awayTeam: string; homeFlag: string; awayFlag: string; kickoffAt: string; hasPick: boolean }

export function GroupDetailView({ group, members, activities, upcomingMatches, stats, champion }: {
  group: Group; members: Member[]; activities: Activity[]; upcomingMatches: UpcomingMatch[];
  stats: { totalPicks: number; winRate: number; activityPerDay: number };
  champion: { name: string; displayName: string; avatar: string; points: number; correct: number; total: number; streak: number } | null;
}) {
  const [tab, setTab] = useState<"overview" | "leaderboard" | "activity" | "matches" | "members">("overview")
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <Link href="/groups" className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors mb-4">
        <ArrowLeft size={15} /> Hội của tôi
      </Link>

      <div className="relative rounded-3xl overflow-hidden mb-5" style={{ background: "linear-gradient(135deg, #0d1a2e 0%, #0a2215 60%, #1a1530 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 600 180" preserveAspectRatio="xMidYMid slice">
          <circle cx="300" cy="90" r="60" fill="none" stroke="#00e676" strokeWidth="2"/>
          <line x1="300" y1="0" x2="300" y2="180" stroke="#00e676" strokeWidth="1.5"/>
        </svg>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #00e676 0%, transparent 70%)", transform: "translate(20%,-20%)" }} />
        <div className="relative p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-white">{group.name}</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                  style={group.visibility === "private"
                    ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }
                    : { background: "rgba(0,188,212,0.1)", color: "#00bcd4" }}>
                  {group.visibility === "private" ? <><Lock size={9}/> Riêng tư</> : <><Globe size={9}/> Công khai</>}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/30">
                <span className="flex items-center gap-1"><Users size={11}/> {group.memberCount} thành viên</span>
                <span>Hạng <strong className="text-white/50">{group.myRank}</strong> / {group.memberCount}</span>
              </div>
            </div>
            <button onClick={copy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              {group.inviteCode}
              {copied ? <Check size={11} style={{ color: "#00e676" }}/> : <Copy size={11}/>}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: "Xu của tôi", value: group.myPoints, color: "#ffd700" },
              { label: "Xếp hạng", value: `#${group.myRank}`, color: "#00e676" },
              { label: "Thành viên", value: group.memberCount, color: "#00bcd4" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-base font-black" style={{ color }}>{value}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 p-1 rounded-2xl overflow-x-auto hide-scrollbar" style={{ background: "rgba(255,255,255,0.03)" }}>
        {[
          { id: "overview", label: "✨ Tổng quan" },
          { id: "leaderboard", label: "🏆 Bảng xếp hạng" },
          { id: "activity", label: "📰 Hoạt động" },
          { id: "matches", label: "⚽ Trận sắp tới" },
          { id: "members", label: "👥 Thành viên" },
        ].map(({ id: tid, label }) => (
          <button key={tid} onClick={() => setTab(tid as typeof tab)}
            className={cn("flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
              tab === tid ? "text-white" : "text-white/30")}
            style={tab === tid ? { background: "rgba(255,255,255,0.08)" } : {}}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          {champion && (
            <div className="relative rounded-3xl overflow-hidden p-5" style={{
              background: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,140,0,0.05), rgba(124,58,237,0.05))",
              border: "1px solid rgba(255,215,0,0.2)"
            }}>
              <div className="relative flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 shadow-lg"
                  style={{ background: "linear-gradient(135deg, #ffd700, #ff8f00)", color: "#0f1117" }}>
                  {champion.avatar}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: "#ffd700" }}>
                    <Crown size={11} /> Vua hội tuần này
                  </div>
                  <div className="text-lg font-black text-white">{champion.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">{champion.displayName}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(255,215,0,0.15)", color: "#ffd700" }}>
                      +{champion.points} xu
                    </span>
                    {champion.streak > 0 && <span className="text-xs text-orange-400 flex items-center gap-0.5"><Flame size={11}/>{champion.streak} streak</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Tổng trận đoán", value: stats.totalPicks, color: "#00e676" },
              { label: "Tỉ lệ đúng TB", value: `${stats.winRate}%`, color: "#ffd700" },
              { label: "Hoạt động/ngày", value: stats.activityPerDay, color: "#00bcd4" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-[#ffd700]" />
              <h3 className="font-bold text-white text-sm">Hoạt động mới nhất</h3>
            </div>
            <div className="space-y-3">
              {activities.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
                    style={{ background: `${activityColors[item.type] ?? "#7c3aed"}22`, color: activityColors[item.type] ?? "#7c3aed" }}>
                    {item.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-bold text-white">{item.user}</span>
                      <span className="text-white/40"> {item.action} </span>
                      <span className="font-semibold" style={{ color: activityColors[item.type] ?? "#7c3aed" }}>{item.target}</span>
                    </p>
                    <div className="text-[10px] text-white/25 mt-0.5">{timeAgo(item.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Header */}
          <div className="flex items-center px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-7 sm:w-8 text-center text-[10px] font-bold text-white/30">#</div>
            <div className="flex-1 text-[10px] font-bold text-white/30 pl-1">Thành viên</div>
            <div className="w-8 sm:w-10 text-center text-[10px] font-bold text-white/30">Đoán</div>
            <div className="w-8 sm:w-10 text-center text-[10px] font-bold" style={{ color: "rgba(0,230,118,0.5)" }}>Đúng</div>
            <div className="w-8 sm:w-10 text-center text-[10px] font-bold" style={{ color: "rgba(255,82,82,0.5)" }}>Sai</div>
            <div className="w-8 sm:w-10 text-center text-[10px] font-bold" style={{ color: "rgba(255,152,0,0.5)" }}>Bỏ</div>
            <div className="w-10 sm:w-12 text-center text-[10px] font-bold text-white/30">Điểm</div>
          </div>
          {/* Rows */}
          {members.map((m, i) => {
            const played = m.wins + m.losses + m.skipped
            return (
              <div key={m.userId}
                className={cn("flex items-center px-3 py-2.5 transition-colors", i < members.length - 1 ? "border-b border-white/5" : "")}
                style={{
                  background: m.isMe ? "rgba(0,230,118,0.06)"
                    : i < 3 ? "rgba(255,215,0,0.02)" : "transparent",
                }}>
                {/* Rank */}
                <div className="w-7 sm:w-8 flex justify-center">
                  {i < 3 ? (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black"
                      style={{
                        background: i === 0 ? "linear-gradient(135deg, #ffd700, #ff8f00)"
                          : i === 1 ? "linear-gradient(135deg, #b0bec5, #78909c)"
                          : "linear-gradient(135deg, #cd7f32, #8d4e0b)",
                        color: "#0f1117"
                      }}>{i === 0 ? <Crown size={10}/> : m.rank}</div>
                  ) : (
                    <span className="text-xs font-bold text-white/25">{m.rank}</span>
                  )}
                </div>
                {/* Avatar + Name */}
                <div className="flex-1 flex items-center gap-2 min-w-0 pl-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                    style={{ background: avatarGradients[i % avatarGradients.length], color: "white" }}>{m.avatar}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={cn("text-xs font-bold truncate", m.isMe ? "text-[#00e676]" : "text-white")}>
                        {m.isMe ? "Bạn" : m.name.split(" ").slice(-2).join(" ")}
                      </span>
                      {m.streak >= 3 && (
                        <span className="text-orange-400 text-[10px] flex items-center"><Flame size={9}/>{m.streak}</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Đoán */}
                <div className="w-8 sm:w-10 text-center text-[11px] sm:text-xs font-semibold text-white/40">{played}</div>
                {/* Đúng */}
                <div className="w-8 sm:w-10 text-center text-[11px] sm:text-xs font-bold" style={{ color: "#00e676" }}>{m.wins}</div>
                {/* Sai */}
                <div className="w-8 sm:w-10 text-center text-[11px] sm:text-xs font-bold" style={{ color: "#ff5252" }}>{m.losses}</div>
                {/* Bỏ */}
                <div className="w-8 sm:w-10 text-center text-[11px] sm:text-xs font-bold" style={{ color: m.skipped > 0 ? "#ff9800" : "rgba(255,255,255,0.15)" }}>{m.skipped}</div>
                {/* Điểm */}
                <div className={cn("w-10 sm:w-12 text-center text-xs sm:text-sm font-black", m.isMe ? "text-[#00e676]" : "text-white")}>{m.points}</div>
              </div>
            )
          })}
        </div>
      )}

      {tab === "activity" && (
        <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-[#00e676]" />
            <h3 className="font-bold text-white text-sm">Dòng hoạt động</h3>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-6">Chưa có hoạt động</p>
          ) : (
            <div className="space-y-3">
              {activities.map(item => (
                <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
                    style={{ background: `${activityColors[item.type] ?? "#7c3aed"}22`, color: activityColors[item.type] ?? "#7c3aed" }}>
                    {item.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-bold text-white">{item.user}</span>
                      <span className="text-white/40"> {item.action} </span>
                      <span className="font-semibold" style={{ color: activityColors[item.type] ?? "#7c3aed" }}>{item.target}</span>
                    </p>
                    <div className="text-[10px] text-white/25 mt-0.5">{timeAgo(item.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "matches" && (
        <div className="space-y-3">
          <p className="text-xs text-white/30 uppercase tracking-widest font-bold mb-3">Trận cần đoán</p>
          {upcomingMatches.map(match => (
            <Link key={match.id} href={`/matches/${match.id}`}>
              <div className="rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative w-10 h-7 rounded overflow-hidden flex-shrink-0"><Image src={flagUrl(match.homeFlag)} alt="" fill className="object-cover" unoptimized/></div>
                  <span className="text-sm font-bold text-white">{match.homeTeam}</span>
                </div>
                <div className="text-center flex-shrink-0">
                  <div className="text-xs font-black text-white/30">VS</div>
                  <div className="text-xs text-white/40 mt-0.5">{formatDateTimeParts(match.kickoffAt).time} · {formatDateTimeParts(match.kickoffAt).date}</div>
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-sm font-bold text-white">{match.awayTeam}</span>
                  <div className="relative w-10 h-7 rounded overflow-hidden flex-shrink-0"><Image src={flagUrl(match.awayFlag)} alt="" fill className="object-cover" unoptimized/></div>
                </div>
                <div className={cn("text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0",
                  match.hasPick ? "text-[#00e676]" : "text-white/30"
                )} style={{ background: match.hasPick ? "rgba(0,230,118,0.1)" : "rgba(255,255,255,0.04)" }}>
                  {match.hasPick ? "✓ Đã đoán" : "Chưa đoán"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "members" && (
        <div className="space-y-2">
          <p className="text-xs text-white/30 uppercase tracking-widest font-bold mb-3">{group.memberCount} thành viên</p>
          {members.map((m, i) => {
            const played = m.wins + m.losses + m.skipped
            const winRate = played > 0 ? Math.round(m.wins / played * 100) : 0
            return (
              <div key={m.userId} className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: m.isMe ? "rgba(0,230,118,0.05)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: avatarGradients[i % avatarGradients.length], color: "white" }}>{m.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-sm font-bold", m.isMe ? "text-[#00e676]" : "text-white/80")}>{m.isMe ? "Bạn" : m.name}</span>
                    {m.isAdmin && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700" }}>Admin</span>}
                  </div>
                  {/* Stats bar giống EPL */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px] text-white/30">Đoán</span>
                      <span className="text-[10px] font-bold text-white/50">{played}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px]" style={{ color: "rgba(0,230,118,0.5)" }}>Đúng</span>
                      <span className="text-[10px] font-bold" style={{ color: "#00e676" }}>{m.wins}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px]" style={{ color: "rgba(255,82,82,0.5)" }}>Sai</span>
                      <span className="text-[10px] font-bold" style={{ color: "#ff5252" }}>{m.losses}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px]" style={{ color: "rgba(255,152,0,0.5)" }}>Bỏ</span>
                      <span className="text-[10px] font-bold" style={{ color: m.skipped > 0 ? "#ff9800" : "rgba(255,255,255,0.15)" }}>{m.skipped}</span>
                    </div>
                    <span className="text-[10px] text-white/20 ml-0.5">{winRate}%</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={cn("text-sm font-black", m.isMe ? "text-[#00e676]" : "text-white/70")}>{m.points}</div>
                  <div className="text-[10px] text-white/25">#{m.rank}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
