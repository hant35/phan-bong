"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, Lock, Globe, Crown, Copy, Check, TrendingUp, TrendingDown, Minus, Flame, Activity, Newspaper, Sparkles, Bell, Send, X, CheckCircle2, AlertCircle, Zap, Loader2, Settings, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { flagUrl, formatDateTimeParts, timeAgo } from "@/lib/format"
import { GroupChat } from "@/components/group-chat"

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
interface Member { rank: number; userId: string; name: string; displayName: string; avatar: string; streak: number; points: number; wins: number; losses: number; skipped: number; isMe: boolean; isAdmin: boolean; role: string }
interface Activity { id: string; type: string; action: string; target: string; user: string; avatar: string; createdAt: string }
interface UpcomingMatch {
  id: string; homeTeam: string; awayTeam: string; homeFlag: string; awayFlag: string
  kickoffAt: string; ahLine: number | null; ouLine: number | null; allowedBetTypes: string[]
  pointsMultiplier: number; blindMode: boolean; hasPick: boolean
  isLive: boolean; scoreHome: number | null; scoreAway: number | null; minute: number | null
  hasConfig: boolean
  predStats: { homeCount: number; awayCount: number; overCount: number; underCount: number }
  myPick: { betType: string; side: string | null; homeScore: number | null; awayScore: number | null } | null
}

export function GroupDetailView({ group, currentUserId, myRole, members, activities, upcomingMatches, stats, champion }: {
  group: Group; currentUserId: string; myRole: string; members: Member[]; activities: Activity[]; upcomingMatches: UpcomingMatch[];
  stats: { totalPicks: number; winRate: number; activityPerDay: number };
  champion: { name: string; displayName: string; avatar: string; points: number; correct: number; total: number; streak: number } | null;
}) {
  const router = useRouter()
  const [tab, setTab] = useState<"overview" | "leaderboard" | "activity" | "matches" | "members">("overview")
  const [copied, setCopied] = useState(false)

  const isGroupAdmin = myRole === "owner" || myRole === "admin"

  // ── Inline pick state ──
  const [pickState, setPickState] = useState<Record<string, {
    betType: string; side: string | null; submitting: boolean; done: boolean; error: string | null
  }>>({})

  function getPickState(matchId: string, match: UpcomingMatch) {
    const defaultBetType = match.allowedBetTypes.includes("ah") && match.ahLine != null ? "ah"
      : match.allowedBetTypes.includes("ou") && match.ouLine != null ? "ou"
      : match.allowedBetTypes[0] ?? "ah"
    return pickState[matchId] ?? {
      betType: match.myPick?.betType ?? defaultBetType,
      side: match.myPick?.side ?? null,
      submitting: false,
      done: match.hasPick,
      error: null,
    }
  }

  function setPick(matchId: string, field: string, value: string | boolean | null) {
    setPickState(prev => ({
      ...prev,
      [matchId]: { ...getPickState(matchId, upcomingMatches.find(m => m.id === matchId)!), [field]: value },
    }))
  }

  async function submitPick(match: UpcomingMatch) {
    const ps = getPickState(match.id, match)
    if (!ps.side) return
    setPick(match.id, "submitting", true)
    setPick(match.id, "error", null)
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, groupId: group.id, betType: ps.betType, side: ps.side, confidence: 3 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPick(match.id, "error", data.error ?? "Có lỗi")
        setPick(match.id, "submitting", false)
        return
      }
      setPickState(prev => ({ ...prev, [match.id]: { ...ps, done: true, submitting: false, error: null } }))
      router.refresh()
    } catch {
      setPick(match.id, "error", "Lỗi mạng")
      setPick(match.id, "submitting", false)
    }
  }

  // ── Notify state (dành cho group admin) ──
  const [showNotify, setShowNotify] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState("")
  const [notifyBody, setNotifyBody] = useState("")
  const [notifySending, setNotifySending] = useState(false)
  const [notifyResult, setNotifyResult] = useState<{ ok: boolean; sent?: number; error?: string } | null>(null)

  async function sendGroupNotify() {
    if (!notifyTitle.trim() || !notifyBody.trim()) return
    setNotifySending(true)
    setNotifyResult(null)
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: notifyTitle, body: notifyBody, target: "group", groupId: group.id }),
      })
      const data = await res.json()
      setNotifyResult(res.ok ? { ok: true, sent: data.sent } : { ok: false, error: data.error })
    } catch {
      setNotifyResult({ ok: false, error: "Lỗi kết nối" })
    } finally {
      setNotifySending(false)
    }
  }

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
            <div className="flex items-center gap-2">
              {isGroupAdmin && (
                <Link href={`/groups/${group.id}/admin`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:scale-105"
                  style={{ background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.15)", color: "#00e676" }}>
                  <Settings size={11}/> Quản trị
                </Link>
              )}
              <button onClick={copy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                {group.inviteCode}
                {copied ? <Check size={11} style={{ color: "#00e676" }}/> : <Copy size={11}/>}
              </button>
            </div>
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

          {/* Trận đang diễn ra + sắp tới */}
          {upcomingMatches.length === 0 ? (
            <div className="rounded-3xl px-5 py-8 text-center space-y-2"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
              <div className="text-2xl">📅</div>
              <p className="text-sm font-bold text-white/40">Chưa có trận nào sắp diễn ra</p>
            </div>
          ) : (
            <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-[#00e676]" />
                  <h3 className="font-bold text-white text-sm">Trận đấu</h3>
                </div>
                <Link href="/matches" className="text-[10px] text-white/30 hover:text-white/60">Xem tất cả →</Link>
              </div>
              <div className="divide-y divide-white/5">
                {upcomingMatches.map(match => {
                  const ps = getPickState(match.id, match)
                  const hasKeo = match.hasConfig && (
                    match.allowedBetTypes.includes("exact")
                    || (match.allowedBetTypes.includes("ah") && match.ahLine != null)
                    || (match.allowedBetTypes.includes("ou") && match.ouLine != null)
                  )
                  const sideLabel = ps.side === "home" ? match.homeTeam
                    : ps.side === "away" ? match.awayTeam
                    : ps.side === "over" ? "Tài" : ps.side === "under" ? "Xỉu" : null

                  const { homeCount, awayCount, overCount, underCount } = match.predStats
                  const ahTotal = homeCount + awayCount
                  const ouTotal = overCount + underCount
                  const homePct = ahTotal > 0 ? Math.round(homeCount / ahTotal * 100) : 50
                  const awayPct = ahTotal > 0 ? 100 - homePct : 50
                  const overPct = ouTotal > 0 ? Math.round(overCount / ouTotal * 100) : 50
                  const underPct = ouTotal > 0 ? 100 - overPct : 50

                  return (
                    <div key={match.id} className="px-4 py-4 space-y-3">

                      {/* Match header */}
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-5 rounded overflow-hidden flex-shrink-0">
                          <Image src={flagUrl(match.homeFlag)} alt="" fill className="object-cover" unoptimized />
                        </div>
                        <span className="text-sm font-bold text-white truncate flex-1">{match.homeTeam}</span>
                        <div className="text-center flex-shrink-0 px-1 min-w-[64px]">
                          {match.isLive ? (
                            <>
                              <div className="text-base font-black text-white">{match.scoreHome ?? 0} – {match.scoreAway ?? 0}</div>
                              <div className="flex items-center justify-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-red-400">{match.minute ?? "?"}&apos;</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-[10px] text-white/30 font-bold">VS</div>
                              <div className="text-[9px] text-white/25">{formatDateTimeParts(match.kickoffAt).time}</div>
                              <div className="text-[9px] text-white/20">{formatDateTimeParts(match.kickoffAt).date}</div>
                            </>
                          )}
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            {match.pointsMultiplier > 1 && (
                              <span className="text-[8px] font-black px-1 rounded"
                                style={{ background: "rgba(255,215,0,0.2)", color: "#ffd700" }}>×{match.pointsMultiplier}</span>
                            )}
                            {match.blindMode && (
                              <span className="text-[8px] px-1 rounded"
                                style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>🙈</span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white truncate flex-1 text-right">{match.awayTeam}</span>
                        <div className="relative w-8 h-5 rounded overflow-hidden flex-shrink-0">
                          <Image src={flagUrl(match.awayFlag)} alt="" fill className="object-cover" unoptimized />
                        </div>
                      </div>

                      {/* Kèo info — luôn hiển thị nếu có */}
                      {(match.ahLine != null || match.ouLine != null) && (
                        <div className="flex gap-2">
                          {match.ahLine != null && (
                            <div className="flex-1 px-2.5 py-1.5 rounded-lg text-center"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                              <div className="text-[9px] text-white/30 font-bold uppercase tracking-wide">Chấp</div>
                              <div className="text-xs font-black text-white/80">
                                {match.ahLine > 0 ? "+" : ""}{match.ahLine}
                              </div>
                            </div>
                          )}
                          {match.ouLine != null && (
                            <div className="flex-1 px-2.5 py-1.5 rounded-lg text-center"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                              <div className="text-[9px] text-white/30 font-bold uppercase tracking-wide">Tài/Xỉu</div>
                              <div className="text-xs font-black text-white/80">{match.ouLine}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tỉ lệ dự đoán */}
                      {(ahTotal > 0 || ouTotal > 0) && (
                        <div className="space-y-1.5">
                          {ahTotal > 0 && (
                            <div>
                              <div className="flex justify-between text-[9px] text-white/30 mb-0.5">
                                <span>{match.homeTeam} {homePct}%</span>
                                <span>{ahTotal} người đoán kèo chấp</span>
                                <span>{awayPct}% {match.awayTeam}</span>
                              </div>
                              <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                                <div className="rounded-l-full transition-all" style={{ width: `${homePct}%`, background: "linear-gradient(90deg,#00e676,#00bcd4)" }} />
                                <div className="rounded-r-full transition-all" style={{ width: `${awayPct}%`, background: "linear-gradient(90deg,#ff5252,#ff1744)" }} />
                              </div>
                            </div>
                          )}
                          {ouTotal > 0 && (
                            <div>
                              <div className="flex justify-between text-[9px] text-white/30 mb-0.5">
                                <span>Tài {overPct}%</span>
                                <span>{ouTotal} người đoán tài/xỉu</span>
                                <span>{underPct}% Xỉu</span>
                              </div>
                              <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                                <div className="rounded-l-full transition-all" style={{ width: `${overPct}%`, background: "linear-gradient(90deg,#ffd700,#ff8f00)" }} />
                                <div className="rounded-r-full transition-all" style={{ width: `${underPct}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)" }} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pick area */}
                      {!match.hasConfig ? (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-[10px] text-white/25 italic">Admin chưa mở kèo cho trận này</span>
                          {isGroupAdmin && (
                            <Link href={`/groups/${group.id}/admin`}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg"
                              style={{ background: "rgba(0,230,118,0.08)", color: "#00e676" }}>
                              Mở kèo
                            </Link>
                          )}
                        </div>
                      ) : match.isLive ? (
                        <div className="text-[10px] text-white/30 text-center py-1">Trận đang diễn ra — kèo đã khóa</div>
                      ) : ps.done ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: "#00e676" }}>
                            <CheckCircle2 size={15} /> Đã đoán: {sideLabel ?? (ps.betType === "exact" ? "Tỉ số" : "—")}
                          </div>
                          <button onClick={() => setPickState(prev => ({ ...prev, [match.id]: { ...ps, done: false } }))}
                            className="text-xs text-white/30 hover:text-white/60 transition-colors underline">
                            Sửa
                          </button>
                        </div>
                      ) : !hasKeo ? (
                        <div className="text-xs text-white/40 text-center py-1">Kèo chưa đủ thông tin</div>
                      ) : (
                        <div className="space-y-2">
                          {match.allowedBetTypes.filter(t => t !== "exact").length > 1 && (
                            <div className="flex gap-1.5">
                              {[{ id: "ah", label: "Kèo chấp" }, { id: "ou", label: "Tài/Xỉu" }]
                                .filter(bt => match.allowedBetTypes.includes(bt.id))
                                .map(bt => (
                                  <button key={bt.id} onClick={() => setPick(match.id, "betType", bt.id)}
                                    className={cn("flex-1 py-1 rounded-lg text-[10px] font-bold transition-all",
                                      ps.betType === bt.id ? "text-[#0f1117]" : "text-white/40")}
                                    style={ps.betType === bt.id
                                      ? { background: "linear-gradient(135deg,#00e676,#00bcd4)" }
                                      : { background: "rgba(255,255,255,0.05)" }}>
                                    {bt.label}
                                  </button>
                                ))}
                            </div>
                          )}

                          {ps.betType === "ah" && match.ahLine != null && (
                            <div className="flex gap-2">
                              {[
                                { id: "home", label: match.homeTeam, sub: `chấp ${match.ahLine > 0 ? "+" : ""}${match.ahLine}`, flag: match.homeFlag },
                                { id: "away", label: match.awayTeam, sub: "nhận chấp", flag: match.awayFlag },
                              ].map(opt => (
                                <button key={opt.id} onClick={() => setPick(match.id, "side", opt.id)}
                                  className={cn("flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all")}
                                  style={ps.side === opt.id
                                    ? { background: "rgba(0,230,118,0.1)", borderColor: "rgba(0,230,118,0.35)" }
                                    : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
                                  <div className="relative w-7 h-5 rounded overflow-hidden flex-shrink-0">
                                    <Image src={flagUrl(opt.flag)} alt="" fill className="object-cover" unoptimized />
                                  </div>
                                  <div className="text-left min-w-0">
                                    <div className={cn("text-xs font-bold truncate", ps.side === opt.id ? "text-[#00e676]" : "text-white/70")}>{opt.label}</div>
                                    <div className="text-[9px] text-white/30">{opt.sub}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {ps.betType === "ou" && match.ouLine != null && (
                            <div className="flex gap-2">
                              {[
                                { id: "over", label: "Tài", sub: `> ${match.ouLine} bàn`, color: "#00e676" },
                                { id: "under", label: "Xỉu", sub: `≤ ${match.ouLine} bàn`, color: "#ff5252" },
                              ].map(opt => (
                                <button key={opt.id} onClick={() => setPick(match.id, "side", opt.id)}
                                  className="flex-1 py-2.5 rounded-xl border text-center transition-all"
                                  style={ps.side === opt.id
                                    ? { background: `${opt.color}15`, borderColor: `${opt.color}40` }
                                    : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
                                  <div className={cn("text-sm font-black", ps.side === opt.id ? "" : "text-white/60")}
                                    style={ps.side === opt.id ? { color: opt.color } : {}}>{opt.label}</div>
                                  <div className="text-[9px] text-white/30">{opt.sub}</div>
                                </button>
                              ))}
                            </div>
                          )}

                          {ps.error && <p className="text-xs text-red-400 px-1">{ps.error}</p>}

                          <div className="flex gap-2">
                            <button onClick={() => submitPick(match)}
                              disabled={ps.submitting || !ps.side}
                              className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                              style={ps.side
                                ? { background: "linear-gradient(135deg,#00e676,#00bcd4)", color: "#0f1117" }
                                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}>
                              {ps.submitting ? <Loader2 size={13} className="animate-spin"/> : <Zap size={13}/>}
                              Xác nhận
                            </button>
                            <Link href={`/matches/${match.id}?from=/groups/${group.id}`}
                              className="px-3 py-2 rounded-xl text-[10px] font-semibold text-white/40 hover:text-white/70 transition-colors flex items-center"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              Chi tiết
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
                    <div className="text-[10px] text-white/50 mt-0.5">{timeAgo(item.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat hội */}
          <GroupChat groupId={group.id} currentUserId={currentUserId} />
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
                    <span className="text-xs font-bold text-white/50">{m.rank}</span>
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
                    <div className="text-[10px] text-white/50 mt-0.5">{timeAgo(item.createdAt)}</div>
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/30 uppercase tracking-widest font-bold">{group.memberCount} thành viên</p>
            {isGroupAdmin && (
              <button onClick={() => { setShowNotify(true); setNotifyResult(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                style={{ background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.2)", color: "#00e676" }}>
                <Bell size={12} /> Gửi thông báo
              </button>
            )}
          </div>
          {members.map((m, i) => {
            const played = m.wins + m.losses + m.skipped
            const winRate = played > 0 ? Math.round(m.wins / played * 100) : 0
            return (
              <div key={m.userId} className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: m.isMe ? "rgba(0,230,118,0.05)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: avatarGradients[i % avatarGradients.length], color: "white" }}>{m.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn("text-sm font-bold", m.isMe ? "text-[#00e676]" : "text-white/80")}>{m.isMe ? "Bạn" : m.name}</span>
                    {m.role === "owner" && <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700" }}><Crown size={8}/>Chủ hội</span>}
                    {m.role === "admin" && <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(0,188,212,0.1)", color: "#00bcd4" }}><Shield size={8}/>Admin</span>}
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
                    <span className="text-[10px] text-white/45 ml-0.5">{winRate}%</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={cn("text-sm font-black", m.isMe ? "text-[#00e676]" : "text-white/70")}>{m.points}</div>
                  <div className="text-[10px] text-white/50">#{m.rank}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* ══ NOTIFY MODAL (group admin) ══ */}
      {showNotify && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowNotify(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl p-6 space-y-4"
            style={{ background: "linear-gradient(145deg, #1a1d28, #0f1117)", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[#00e676]" />
                <h3 className="text-base font-bold text-white">Gửi thông báo hội</h3>
              </div>
              <button onClick={() => setShowNotify(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold mb-1.5">Tiêu đề</p>
              <input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)}
                placeholder="VD: 🔥 Chuẩn bị đoán trận tối nay!"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/35 outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>

            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold mb-1.5">Nội dung</p>
              <textarea value={notifyBody} onChange={e => setNotifyBody(e.target.value)}
                placeholder="Nhắn gì đó với hội..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/35 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>

            {notifyResult && (
              <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold",
                notifyResult.ok ? "text-[#00e676]" : "text-red-400"
              )}
              style={notifyResult.ok
                ? { background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)" }
                : { background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.2)" }}>
                {notifyResult.ok
                  ? <><CheckCircle2 size={15}/> Đã gửi tới {notifyResult.sent} thiết bị</>
                  : <><AlertCircle size={15}/> {notifyResult.error}</>
                }
              </div>
            )}

            <button onClick={sendGroupNotify}
              disabled={notifySending || !notifyTitle.trim() || !notifyBody.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-[#0f1117] transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
              <Send size={14} />
              {notifySending ? "Đang gửi..." : `Gửi tới ${group.memberCount} thành viên`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
