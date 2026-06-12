"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Lock, BarChart3, Users, Zap, Cloud, MapPin, Trophy, Flame, Info, Loader2 } from "lucide-react"
import { LivePanel } from "@/components/live-panel"
import { useToast } from "@/components/toast"
import { HopeStarPicker } from "@/components/hope-star-picker"
import { cn } from "@/lib/utils"
import { DEFAULT_HOPE_STAR, hopeStarLabel, HOPE_STAR_WIN, HOPE_STAR_LOSS } from "@/lib/hope-star"
import { flagUrl, formatDateTimeParts } from "@/lib/format"

const BET_TYPES = [
  { id: "ah", label: "Kèo chấp", emoji: "⚖️", enabled: true },
  { id: "ou", label: "Tổng bàn thắng", emoji: "📊", enabled: true },
  { id: "exact", label: "Tỉ số", emoji: "🎯", enabled: true },
]

interface Match {
  id: string
  homeTeam: string; awayTeam: string
  homeFlag: string; awayFlag: string
  homeColor?: string | null; awayColor?: string | null
  kickoffAt: string; stage: string; venue?: string | null
  status: string
  scoreHome?: number | null; scoreAway?: number | null; minute?: number | null
  ahLine?: number | null; ouLine?: number | null
  weather?: { icon: string | null; temp: number | null; condition: string | null } | null
  h2h?: { home: number | null; draw: number | null; away: number | null; recent: string[] } | null
  consensus?: { home: number; draw: number; away: number } | null
  predictorsCount: number
  predictors: { name: string; avatar: string; streak: number; side: string | null; betType: string; confidence: number }[]
  myPick?: { betType: string; side?: string | null; homeScore?: number | null; awayScore?: number | null; confidence: number; result?: string | null; points: number } | null
}

export function MatchDetailView({ match, currentUserId, isInGroup, userGroups }: {
  match: Match; currentUserId: string; isInGroup: boolean
  userGroups: { id: string; name: string }[]
}) {
  const router = useRouter()
  const toast = useToast()
  const searchParams = useSearchParams()
  const backUrl = searchParams.get("from") ?? "/matches"
  const backLabel = backUrl.startsWith("/groups/") ? "← Hội" : "← Lịch trận"

  // Xác định groupId: ưu tiên từ context URL, fallback sang group đầu tiên
  const groupIdFromUrl = backUrl.startsWith("/groups/") ? backUrl.split("/groups/")[1].split("/")[0] : null
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groupIdFromUrl ?? (userGroups.length === 1 ? userGroups[0].id : null)
  )
  const showGroupPicker = !selectedGroupId && userGroups.length > 1

  const [tab, setTab] = useState<"pick" | "info" | "group">("pick")
  const [betType, setBetType] = useState(match.myPick?.betType ?? "ah")
  const [pick, setPick] = useState<string | null>(match.myPick?.side ?? null)
  const [homeScore, setHomeScore] = useState(match.myPick?.homeScore ?? 1)
  const [awayScore, setAwayScore] = useState(match.myPick?.awayScore ?? 0)
  const [confidence, setConfidence] = useState(match.myPick?.confidence ?? DEFAULT_HOPE_STAR)
  const [submitted, setSubmitted] = useState(!!match.myPick)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLocked = match.status !== "scheduled"
  const kickoff = new Date(match.kickoffAt)
  async function submit() {
    if (!selectedGroupId) { setError("Chọn hội muốn đoán trước"); return }
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        matchId: match.id, groupId: selectedGroupId, betType,
        confidence: confidence || DEFAULT_HOPE_STAR,
      }
      if (betType === "exact") { body.homeScore = homeScore; body.awayScore = awayScore }
      else body.side = pick
      const res = await fetch("/api/predictions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Có lỗi"); toast.error(data.error ?? "Không lưu được dự đoán"); return }
      setSubmitted(true)
      toast.success("Đã lưu dự đoán! 🎯")
      router.refresh()
    } catch { setError("Lỗi mạng"); toast.error("Lỗi mạng, thử lại nhé") }
    finally { setSubmitting(false) }
  }

  const formColor = "#ec4899"

  return (
    <div>
      <Link href={backUrl} className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors mb-4">
        <ArrowLeft size={15} /> {backLabel.replace("← ", "")}
      </Link>

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden mb-5">
        <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, ${match.homeColor ?? "#1a1d2e"}40 0%, rgba(15,17,23,0.9) 45%, ${match.awayColor ?? "#1a1d2e"}40 100%)`
        }} />
        <div className="relative px-5 py-6">
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs text-white/30 font-medium tracking-wide uppercase">{match.stage}</span>
            {match.status === "live" && (
              <div className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">
                <span className="live-dot w-1.5 h-1.5 bg-white rounded-full inline-block" />
                LIVE · {match.minute}&apos;
              </div>
            )}
            {match.status === "finished" && <span className="text-xs text-white/30 font-medium">Kết thúc</span>}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="relative w-20 h-14 rounded-2xl overflow-hidden ring-2 ring-white/10 shadow-xl">
                <Image src={flagUrl(match.homeFlag)} alt={match.homeTeam} fill className="object-cover" unoptimized />
              </div>
              <span className="font-bold text-white text-sm text-center">{match.homeTeam}</span>
            </div>
            <div className="text-center flex-shrink-0">
              {match.status !== "scheduled" ? (
                <div className="score-font text-5xl font-black text-white">
                  {match.scoreHome}<span className="text-white/45 mx-1">–</span>{match.scoreAway}
                </div>
              ) : (
                <>
                  <div className="text-white/40 font-black text-3xl">VS</div>
                  <div className="text-white/50 text-sm font-bold mt-1">{formatDateTimeParts(kickoff).time}</div>
                  <div className="text-white/30 text-xs mt-0.5">{formatDateTimeParts(kickoff).date}</div>
                </>
              )}
            </div>
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="relative w-20 h-14 rounded-2xl overflow-hidden ring-2 ring-white/10 shadow-xl">
                <Image src={flagUrl(match.awayFlag)} alt={match.awayTeam} fill className="object-cover" unoptimized />
              </div>
              <span className="font-bold text-white text-sm text-center">{match.awayTeam}</span>
            </div>
          </div>

          {match.h2h && match.h2h.home !== null && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="text-center px-3">
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">H2H</div>
                <div className="flex items-center gap-1 text-xs font-black">
                  <span style={{ color: match.homeColor ?? "#00e676" }}>{match.h2h.home}</span>
                  <span className="text-white/45">–</span>
                  <span style={{ color: "#ffd700" }}>{match.h2h.draw}</span>
                  <span className="text-white/45">–</span>
                  <span style={{ color: match.awayColor ?? "#00bcd4" }}>{match.h2h.away}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 mt-5 pt-4 border-t border-white/5">
            {match.ahLine !== null && (
              <div className="glass rounded-xl px-3 py-1.5 text-xs">
                <span className="text-white/30">Chấp </span>
                <span className="font-bold text-white/70">{match.ahLine && match.ahLine > 0 ? `+${match.ahLine}` : match.ahLine}</span>
              </div>
            )}
            {match.ouLine !== null && (
              <div className="glass rounded-xl px-3 py-1.5 text-xs">
                <span className="text-white/30">Tổng bàn thắng </span>
                <span className="font-bold text-white/70">{match.ouLine}</span>
              </div>
            )}
            {match.venue && (
              <div className="glass rounded-xl px-3 py-1.5 text-xs">
                <span className="text-white/30">Sân </span>
                <span className="font-bold text-white/70 truncate">{match.venue.split(",")[0]}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Odds explanation */}
      {(match.ahLine !== null || match.ouLine !== null) && (
        <OddsExplainer homeTeam={match.homeTeam} awayTeam={match.awayTeam} ahLine={match.ahLine ?? null} ouLine={match.ouLine ?? null} />
      )}

      {/* Live Panel — show for live/finished matches or when predictions exist */}
      {(match.status === "live" || match.status === "finished" || match.predictorsCount > 0) && (
        <LivePanel matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} status={match.status} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
        {[
          { id: "pick", label: "Đoán", icon: Zap },
          { id: "info", label: "Thông tin", icon: Info },
          { id: "group", label: "Cả hội", icon: Users },
        ].map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} onClick={() => setTab(tid as typeof tab)}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              tab === tid ? "text-white" : "text-white/50")}
            style={tab === tid ? { background: "rgba(255,255,255,0.08)" } : {}}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Pick */}
      {tab === "pick" && (
        <div className="space-y-4">
          {/* Group picker khi user ở nhiều hội và không có context URL */}
          {showGroupPicker && isInGroup && !isLocked && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-white/60">Chọn hội để đặt kèo:</p>
              <div className="grid grid-cols-1 gap-2">
                {userGroups.map(g => (
                  <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{ background: "rgba(0,230,118,0.06)", border: "1px solid rgba(0,230,118,0.15)" }}>
                    <span className="text-xl">🏟️</span>
                    <span className="font-semibold text-white text-sm">{g.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hiện group đang đoán (khi đã chọn và có nhiều hội) */}
          {selectedGroupId && userGroups.length > 1 && !isLocked && !submitted && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-white/30">
                Đoán cho: <span className="text-white/60 font-semibold">{userGroups.find(g => g.id === selectedGroupId)?.name}</span>
              </span>
              <button onClick={() => setSelectedGroupId(null)} className="text-xs text-white/25 hover:text-white/50 transition-colors underline">
                Đổi hội
              </button>
            </div>
          )}

          {match.ahLine == null && match.ouLine == null && !isLocked ? (
            <div className="glass rounded-2xl p-6 text-center space-y-2">
              <div className="text-4xl">⏳</div>
              <p className="font-black text-white">Chưa có kèo</p>
              <p className="text-sm text-white/40">Ban tổ chức chưa mở kèo cho trận này. Quay lại sau để dự đoán.</p>
            </div>
          ) : !isInGroup && !isLocked ? (
            <div className="glass rounded-2xl p-6 text-center space-y-4">
              <div className="text-4xl">🏟️</div>
              <div>
                <p className="font-black text-white text-lg">Vào hội để dự đoán</p>
                <p className="text-sm text-white/40 mt-1">Bạn cần tham gia ít nhất một hội mới có thể đặt kèo và ganh đua với bạn bè.</p>
              </div>
              <Link href="/groups"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#0f1117] transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
                <Users size={15} /> Tìm hội hoặc tạo hội mới
              </Link>
            </div>
          ) : isLocked ? (
            <div className="glass rounded-2xl p-6 text-center">
              <Lock size={28} className="mx-auto mb-3 text-white/45" />
              <p className="font-bold text-white/50">Kèo đã khóa</p>
              <p className="text-sm text-white/50 mt-1">{match.status === "live" ? "Trận đang diễn ra" : "Trận đã kết thúc"}</p>
              {match.myPick && (
                <div className="mt-4 inline-block rounded-xl px-4 py-2"
                  style={{ background: match.myPick.result === "win" ? "rgba(0,230,118,0.1)" : "rgba(255,82,82,0.1)" }}>
                  <span className="text-sm font-bold" style={{ color: match.myPick.result === "win" ? "#00e676" : "#ff5252" }}>
                    Pick của bạn: {match.myPick.points > 0 ? `+${match.myPick.points}` : match.myPick.points} xu
                  </span>
                </div>
              )}
            </div>
          ) : submitted ? (
            <div className="rounded-2xl p-4 border border-[#00e676]/20" style={{ background: "rgba(0,230,118,0.06)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-[#00e676]">✅ Đã đoán xong</p>
                  <p className="text-sm text-white/40 mt-1">
                    {betType === "exact" ? `Tỉ số: ${homeScore}–${awayScore}` :
                     betType === "ou" ? `Tổng bàn thắng → ${pick === "over" ? "Trên" : "Dưới"}` :
                     `Kèo → ${pick === "home" ? match.homeTeam : pick === "away" ? match.awayTeam : "Hòa"}`}
                  </p>
                  <p className="text-xs text-white/45 mt-1">
                    {hopeStarLabel(confidence)} · Còn {Math.max(0, Math.floor((kickoff.getTime() - Date.now()) / 60000))}p có thể sửa
                  </p>
                </div>
                <button onClick={() => setSubmitted(false)} className="text-xs text-[#00e676]/60 hover:text-[#00e676] transition-colors underline">
                  Sửa
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {BET_TYPES.map(bt => (
                  <button key={bt.id}
                    onClick={() => bt.enabled && (setBetType(bt.id), setPick(null))}
                    disabled={!bt.enabled}
                    className={cn("p-3 rounded-2xl text-center transition-all border relative", !bt.enabled && "opacity-40 cursor-not-allowed")}
                    style={betType === bt.id && bt.enabled
                      ? { background: "rgba(0,230,118,0.1)", borderColor: "rgba(0,230,118,0.3)" }
                      : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="text-xl mb-1">{bt.emoji}</div>
                    <div className={cn("text-xs font-bold", betType === bt.id && bt.enabled ? "text-[#00e676]" : "text-white/40")}>{bt.label}</div>
                    {!bt.enabled && <div className="text-[9px] text-white/50 mt-0.5">Sắp ra mắt</div>}
                  </button>
                ))}
              </div>

              {betType === "ah" && match.ahLine != null && (
                <div className="px-3 py-2.5 rounded-xl text-xs text-white/50 leading-relaxed"
                  style={{ background: "rgba(0,230,118,0.05)", border: "1px solid rgba(0,230,118,0.1)" }}>
                  <span className="text-[#00e676] font-bold">⚖️ Kèo chấp {match.ahLine > 0 ? `+${match.ahLine}` : match.ahLine}:</span>{" "}
                  {match.ahLine < 0
                    ? `${match.homeTeam} chấp ${Math.abs(match.ahLine)} trái. Chọn Nhà thắng nếu nhà thắng cách biệt hơn ${Math.abs(match.ahLine)} bàn. Chọn Khách thắng nếu khách thắng, hòa, hoặc thua dưới ${Math.abs(match.ahLine)} bàn.`
                    : match.ahLine > 0
                    ? `${match.awayTeam} chấp ${match.ahLine} trái. Chọn Khách thắng nếu khách thắng cách biệt hơn ${match.ahLine} bàn. Ngược lại chọn Nhà.`
                    : "Kèo đồng banh. Ai thắng trận người đó thắng kèo. Hòa thì hoàn lại."}
                </div>
              )}

              {betType === "ah" && (
                <div className="grid gap-2 grid-cols-2">
                  {[
                    { id: "home", team: match.homeTeam, flag: match.homeFlag, sub: `chấp ${match.ahLine}` },
                    { id: "away", team: match.awayTeam, flag: match.awayFlag, sub: "nhận chấp" },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setPick(opt.id)}
                      className="py-4 rounded-2xl border text-center transition-all"
                      style={pick === opt.id
                        ? { background: "rgba(0,230,118,0.1)", borderColor: "rgba(0,230,118,0.35)" }
                        : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
                      {opt.flag ? (
                        <div className="relative w-12 h-8 mx-auto mb-2 rounded-lg overflow-hidden">
                          <Image src={flagUrl(opt.flag)} alt={opt.team} fill className="object-cover" unoptimized />
                        </div>
                      ) : <div className="text-2xl mb-2">🤝</div>}
                      <div className={cn("font-bold text-sm", pick === opt.id ? "text-[#00e676]" : "text-white/70")}>{opt.team}</div>
                      <div className="text-xs text-white/30 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              )}

              {betType === "ou" && match.ouLine != null && (
                <div className="px-3 py-2.5 rounded-xl text-xs text-white/50 leading-relaxed"
                  style={{ background: "rgba(0,188,212,0.05)", border: "1px solid rgba(0,188,212,0.1)" }}>
                  <span className="text-[#00bcd4] font-bold">📊 Tổng bàn thắng {match.ouLine}:</span>{" "}
                  Chọn <strong className="text-white/70">Trên</strong> nếu tổng số bàn thắng cả hai đội nhiều hơn {match.ouLine}. Chọn <strong className="text-white/70">Dưới</strong> nếu ít hơn hoặc bằng {match.ouLine} bàn.
                </div>
              )}

              {betType === "ou" && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "over", label: "Trên", sub: `Hơn ${match.ouLine}`, emoji: "📈", color: "#00e676" },
                    { id: "under", label: "Dưới", sub: `Ít hơn ${match.ouLine}`, emoji: "📉", color: "#ff5252" },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setPick(opt.id)}
                      className="py-5 rounded-2xl border text-center transition-all"
                      style={pick === opt.id
                        ? { background: `${opt.color}15`, borderColor: `${opt.color}40` }
                        : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
                      <div className="text-3xl mb-2">{opt.emoji}</div>
                      <div className={cn("font-black text-lg", pick === opt.id ? "" : "text-white/70")}
                        style={pick === opt.id ? { color: opt.color } : {}}>{opt.label}</div>
                      <div className="text-xs text-white/30">{opt.sub} bàn</div>
                    </button>
                  ))}
                </div>
              )}

              {betType === "exact" && (
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <div className="relative w-16 h-11 mx-auto mb-2 rounded-xl overflow-hidden">
                        <Image src={flagUrl(match.homeFlag)} alt={match.homeTeam} fill className="object-cover" unoptimized />
                      </div>
                      <p className="text-xs text-white/40 mb-2">{match.homeTeam}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
                          className="w-8 h-8 rounded-xl text-white/50 font-bold" style={{ background: "rgba(255,255,255,0.06)" }}>−</button>
                        <span className="text-3xl font-black text-white w-10 text-center score-font">{homeScore}</span>
                        <button onClick={() => setHomeScore(homeScore + 1)}
                          className="w-8 h-8 rounded-xl font-bold" style={{ background: "rgba(0,230,118,0.15)", color: "#00e676" }}>+</button>
                      </div>
                    </div>
                    <div className="text-3xl font-black text-white/40">–</div>
                    <div className="text-center">
                      <div className="relative w-16 h-11 mx-auto mb-2 rounded-xl overflow-hidden">
                        <Image src={flagUrl(match.awayFlag)} alt={match.awayTeam} fill className="object-cover" unoptimized />
                      </div>
                      <p className="text-xs text-white/40 mb-2">{match.awayTeam}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
                          className="w-8 h-8 rounded-xl text-white/50 font-bold" style={{ background: "rgba(255,255,255,0.06)" }}>−</button>
                        <span className="text-3xl font-black text-white w-10 text-center score-font">{awayScore}</span>
                        <button onClick={() => setAwayScore(awayScore + 1)}
                          className="w-8 h-8 rounded-xl font-bold" style={{ background: "rgba(0,230,118,0.15)", color: "#00e676" }}>+</button>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-xs mt-4 text-white/40">
                    🎯 Thưởng/phạt xu theo <strong className="text-white/60">Ngôi sao hi vọng</strong> bạn chọn bên dưới
                  </p>
                </div>
              )}

              <HopeStarPicker value={confidence} onChange={setConfidence} />

              {error && (
                <div className="rounded-xl px-3 py-2 text-xs text-red-300" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.2)" }}>
                  {error}
                </div>
              )}

              <button onClick={submit} disabled={submitting || (!pick && betType !== "exact")}
                className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40"
                style={(pick || betType === "exact")
                  ? { background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}>
                {submitting ? <Loader2 size={18} className="animate-spin"/> : <Zap size={18} />}
                {submitting ? "Đang gửi..." : "Xác nhận đoán"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Info */}
      {tab === "info" && (
        <div className="space-y-4">
          {match.weather && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Cloud size={13} className="text-[#00bcd4]" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Thời tiết</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl">{match.weather.icon}</span>
                  <span className="text-2xl font-black text-white">{match.weather.temp}°C</span>
                </div>
                <div className="text-xs text-white/40">{match.weather.condition}</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={13} className="text-orange-400" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sân</span>
                </div>
                <div className="font-bold text-white text-sm">{match.venue?.split(",")[0]}</div>
                <div className="text-xs text-white/40 mt-0.5">{match.venue?.split(",").slice(1).join(",")}</div>
              </div>
            </div>
          )}

          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.06), rgba(0,230,118,0.03))", border: "1px solid rgba(255,215,0,0.1)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={13} style={{ color: "#ffd700" }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#ffd700" }}>Ngôi sao hi vọng</span>
            </div>
            <div className="space-y-1.5">
              {([1, 2, 3, 4, 5] as const).map(star => {
                const win = HOPE_STAR_WIN[star]
                const loss = HOPE_STAR_LOSS[star]
                const r = { star, win: `+${win}`, loss: loss === 0 ? "0" : `−${loss}` }
                return (
                <div key={r.star} className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-xs font-bold text-white/50">{"⭐".repeat(r.star)}</span>
                  <span className="text-[11px] text-white/60">
                    Thắng <strong className="text-[#00e676]">{r.win}</strong>
                    {" · "}
                    Thua <strong className={r.loss === "0" ? "text-white/40" : "text-red-400"}>{r.loss}</strong>
                  </span>
                </div>
              )})}
            </div>
          </div>

          {match.predictors.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Flame size={13} className="text-orange-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cao thủ đã đoán trận này</span>
              </div>
              <div className="space-y-2">
                {match.predictors.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-black text-white/30 w-4">#{i+1}</span>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}>
                      {p.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-white/30">
                        Chọn {p.side === "home" ? match.homeTeam : p.side === "away" ? match.awayTeam : "Hòa"} · {p.betType.toUpperCase()}
                        {p.streak > 0 && <span className="text-orange-400 ml-1.5 inline-flex items-center gap-0.5"><Flame size={9}/>{p.streak}</span>}
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(c => (
                        <div key={c} className="w-1 h-3 rounded-sm" style={{ background: c <= p.confidence ? "#00e676" : "rgba(255,255,255,0.08)" }}/>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Group */}
      {tab === "group" && (
        <div className="space-y-3">
          <div className="glass rounded-2xl p-4">
            <h3 className="font-bold text-white/70 mb-4 flex items-center gap-2 text-sm">
              <BarChart3 size={15} /> Đồng thuận hội ({match.predictorsCount} người)
            </h3>

            {match.consensus ? (
              <div className="mb-4">
                <div className="h-3 rounded-full overflow-hidden flex mb-2">
                  <div style={{ width: `${match.consensus.home}%`, background: match.homeColor ?? "#00e676" }} />
                  {match.consensus.draw > 0 && <div style={{ width: `${match.consensus.draw}%`, background: "#ffd700" }} />}
                  <div style={{ width: `${match.consensus.away}%`, background: match.awayColor ?? "#00bcd4" }} />
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span style={{ color: match.homeColor ?? "#00e676" }}>{match.consensus.home}%</span>
                  {match.consensus.draw > 0 && <span style={{ color: "#ffd700" }}>Hòa {match.consensus.draw}%</span>}
                  <span style={{ color: match.awayColor ?? "#00bcd4" }}>{match.consensus.away}%</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center py-4">Chưa có ai đoán trận này</p>
            )}

            {match.h2h && match.h2h.home !== null && (
              <div className="rounded-xl p-3 mb-1" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-[10px] text-white/30 uppercase tracking-widest text-center mb-2">Lịch sử đối đầu</div>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="text-center">
                    <div className="text-xl font-black" style={{ color: match.homeColor ?? "#00e676" }}>{match.h2h.home}</div>
                    <div className="text-[10px] text-white/30 truncate max-w-16">{match.homeTeam}</div>
                  </div>
                  <div className="text-center px-2">
                    <div className="text-xl font-black text-white/40">{match.h2h.draw}</div>
                    <div className="text-[10px] text-white/30">Hòa</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black" style={{ color: match.awayColor ?? "#00bcd4" }}>{match.h2h.away}</div>
                    <div className="text-[10px] text-white/30 truncate max-w-16">{match.awayTeam}</div>
                  </div>
                </div>
                <div className="flex justify-center gap-1.5">
                  {match.h2h.recent.map((r, i) => (
                    <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

/* ══════════ ODDS EXPLAINER ══════════ */
function OddsExplainer({ homeTeam, awayTeam, ahLine, ouLine }: {
  homeTeam: string; awayTeam: string; ahLine: number | null; ouLine: number | null
}) {
  // ── Kèo chấp explanation ──
  function explainAH(line: number): { summary: string; homeWin: string; awayWin: string; draw?: string } {
    const absLine = Math.abs(line)
    const favTeam = line < 0 ? homeTeam : line > 0 ? awayTeam : ""
    const dogTeam = line < 0 ? awayTeam : line > 0 ? homeTeam : ""

    if (line === 0) {
      return {
        summary: `Kèo đồng banh — hai đội ngang sức, không ai chấp ai.`,
        homeWin: `${homeTeam} thắng trận → Chọn "${homeTeam}" thắng kèo.`,
        awayWin: `${awayTeam} thắng trận → Chọn "${awayTeam}" thắng kèo.`,
        draw: `Hòa → Hoàn xu cho cả hai bên.`,
      }
    }

    // Fractional lines (e.g. -0.25, -0.75, -1.25, -1.75)
    const isFrac = absLine % 0.5 !== 0 && absLine % 1 !== 0
    // Half lines (e.g. -0.5, -1.5, -2.5) — no draw possible
    const isHalf = absLine % 1 === 0.5

    if (isHalf) {
      const goals = Math.ceil(absLine)
      return {
        summary: `${favTeam} chấp ${absLine} trái — cần thắng cách biệt ${goals}+ bàn để thắng kèo.`,
        homeWin: line < 0
          ? `${homeTeam} thắng ${goals}+ bàn → Chọn "${homeTeam}" thắng kèo. Ví dụ: ${goals}-0, ${goals+1}-1...`
          : `${homeTeam} thắng/hòa/thua ≤${goals-1} bàn → Chọn "${homeTeam}" thắng kèo.`,
        awayWin: line < 0
          ? `${awayTeam} thắng/hòa/thua ≤${goals-1} bàn → Chọn "${awayTeam}" thắng kèo.`
          : `${awayTeam} thắng ${goals}+ bàn → Chọn "${awayTeam}" thắng kèo.`,
      }
    }

    if (isFrac) {
      const lower = Math.floor(absLine * 2) / 2 // e.g. 0.75 → 0.5, 1.25 → 1.0
      const upper = Math.ceil(absLine * 2) / 2  // e.g. 0.75 → 1.0, 1.25 → 1.5
      return {
        summary: `${favTeam} chấp ${absLine} trái — kèo nửa-nửa (½ tiền theo kèo ${lower}, ½ tiền theo kèo ${upper}).`,
        homeWin: line < 0
          ? `${homeTeam} thắng cách biệt > ${Math.ceil(absLine)} bàn → thắng full. Thắng đúng ${Math.ceil(absLine)} bàn → thắng nửa.`
          : `${homeTeam} thắng → thắng full kèo. Hòa → thắng nửa kèo.`,
        awayWin: line < 0
          ? `${awayTeam} thắng/hòa → thắng full kèo. ${homeTeam} chỉ thắng ${Math.floor(absLine)} bàn → ${awayTeam} thắng nửa.`
          : `${awayTeam} thắng cách biệt > ${Math.ceil(absLine)} bàn → thắng full.`,
      }
    }

    // Whole number lines (e.g. -1, -2)
    return {
      summary: `${favTeam} chấp ${absLine} trái — cần thắng hơn ${absLine} bàn để thắng kèo.`,
      homeWin: line < 0
        ? `${homeTeam} thắng > ${absLine} bàn → Chọn "${homeTeam}" thắng kèo. Ví dụ: ${absLine+1}-0, ${absLine+2}-1...`
        : `${homeTeam} không thua > ${absLine} bàn → Chọn "${homeTeam}" thắng kèo.`,
      awayWin: line < 0
        ? `${awayTeam} không thua > ${absLine} bàn → Chọn "${awayTeam}" thắng kèo.`
        : `${awayTeam} thắng > ${absLine} bàn → Chọn "${awayTeam}" thắng kèo.`,
      draw: `${favTeam} thắng đúng ${absLine} bàn → Hoàn xu.`,
    }
  }

  // ── Tổng bàn thắng explanation ──
  function explainOU(line: number): { summary: string; over: string; under: string; draw?: string } {
    const isHalf = line % 1 === 0.5
    const isWhole = line % 1 === 0
    const ceil = Math.ceil(line)

    if (isHalf) {
      return {
        summary: `Mốc ${line} bàn — không có hòa, rõ ràng thắng/thua.`,
        over: `Tổng bàn ≥ ${ceil} → Trên thắng. Ví dụ: 2-1 (3 bàn), 3-0 (3 bàn)...`,
        under: `Tổng bàn ≤ ${ceil - 1} → Dưới thắng. Ví dụ: 1-0 (1 bàn), 0-0 (0 bàn)...`,
      }
    }

    if (isWhole) {
      return {
        summary: `Mốc ${line} bàn — đúng ${line} bàn thì hoàn xu.`,
        over: `Tổng bàn ≥ ${line + 1} → Trên thắng.`,
        under: `Tổng bàn ≤ ${line - 1} → Dưới thắng.`,
        draw: `Tổng bàn = ${line} → Hoàn xu cho cả hai.`,
      }
    }

    // Quarter lines (e.g. 2.25, 2.75)
    const lower = Math.floor(line * 2) / 2
    const upper = Math.ceil(line * 2) / 2
    return {
      summary: `Mốc ${line} bàn — kèo nửa-nửa (½ tiền theo ${lower}, ½ tiền theo ${upper}).`,
      over: `Tổng bàn ≥ ${Math.ceil(upper)} → Trên thắng full. Tổng = ${Math.ceil(lower)} → Trên thắng nửa.`,
      under: `Tổng bàn ≤ ${Math.floor(lower)} → Dưới thắng full. Tổng = ${Math.ceil(lower)} → Dưới thắng nửa.`,
    }
  }

  const ah = ahLine !== null ? explainAH(ahLine) : null
  const ou = ouLine !== null ? explainOU(ouLine) : null

  return (
    <div className="rounded-2xl p-4 mb-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2">
        <Info size={14} className="text-[#ffd700]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#ffd700]/70">Diễn giải kèo trận này</span>
      </div>

      {ah && (
        <div className="rounded-xl p-3.5 space-y-2.5" style={{ background: "rgba(0,230,118,0.04)", border: "1px solid rgba(0,230,118,0.1)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black px-2 py-0.5 rounded-md" style={{ background: "rgba(0,230,118,0.15)", color: "#00e676" }}>
              Chấp {ahLine! > 0 ? `+${ahLine}` : ahLine}
            </span>
            <span className="text-xs font-bold text-white/60">Kèo chấp (AH)</span>
          </div>
          <p className="text-sm text-white/50 leading-relaxed">{ah.summary}</p>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded font-bold bg-green-500/15 text-green-400 flex-shrink-0">Nhà</span>
              <p className="text-xs text-white/40 leading-relaxed">{ah.homeWin}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded font-bold bg-blue-500/15 text-blue-400 flex-shrink-0">Khách</span>
              <p className="text-xs text-white/40 leading-relaxed">{ah.awayWin}</p>
            </div>
            {ah.draw && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded font-bold bg-[#ffd700]/15 text-[#ffd700] flex-shrink-0">Hòa</span>
                <p className="text-xs text-white/40 leading-relaxed">{ah.draw}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {ou && (
        <div className="rounded-xl p-3.5 space-y-2.5" style={{ background: "rgba(0,188,212,0.04)", border: "1px solid rgba(0,188,212,0.1)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black px-2 py-0.5 rounded-md" style={{ background: "rgba(0,188,212,0.15)", color: "#00bcd4" }}>
              Tổng bàn thắng {ouLine}
            </span>
            <span className="text-xs font-bold text-white/60">Tổng bàn thắng (O/U)</span>
          </div>
          <p className="text-sm text-white/50 leading-relaxed">{ou.summary}</p>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded font-bold bg-red-500/15 text-red-400 flex-shrink-0">Trên</span>
              <p className="text-xs text-white/40 leading-relaxed">{ou.over}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded font-bold bg-purple-500/15 text-purple-400 flex-shrink-0">Dưới</span>
              <p className="text-xs text-white/40 leading-relaxed">{ou.under}</p>
            </div>
            {ou.draw && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded font-bold bg-[#ffd700]/15 text-[#ffd700] flex-shrink-0">Hòa</span>
                <p className="text-xs text-white/40 leading-relaxed">{ou.draw}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
