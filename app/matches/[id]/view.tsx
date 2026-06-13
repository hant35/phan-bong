"use client"

import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, BarChart3, Cloud, Info, MapPin, Trophy, Flame } from "lucide-react"
import { LivePanel } from "@/components/live-panel"
import { HOPE_STAR_WIN, HOPE_STAR_LOSS } from "@/lib/hope-star"
import { flagUrl, formatDateTimeParts } from "@/lib/format"

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
  blindModeActive: boolean
  consensus?: { home: number; draw: number; away: number } | null
  predictorsCount: number
  predictors: { name: string; avatar: string; streak: number; side: string | null; betType: string; confidence: number; homeScore?: number | null; awayScore?: number | null }[]
  nonPredictors: { name: string; avatar: string }[]
  myPick?: { betType: string; side?: string | null; homeScore?: number | null; awayScore?: number | null; confidence: number; result?: string | null; points: number } | null
}

export function MatchDetailView({ match, currentUserId, isInGroup, userGroups }: {
  match: Match; currentUserId: string; isInGroup: boolean
  userGroups: { id: string; name: string }[]
}) {
  const searchParams = useSearchParams()
  const backUrl = searchParams.get("from") ?? "/matches"
  const backLabel = backUrl.startsWith("/groups/") ? "Hội" : "Lịch trận"

  const kickoff = new Date(match.kickoffAt)

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

      {/* Live Panel */}
      {(match.status === "live" || match.status === "finished" || match.predictorsCount > 0) && (
        <LivePanel matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} status={match.status} />
      )}

      {/* My Pick Banner */}
      {match.myPick && (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3 mb-4"
          style={match.myPick.result === "win"
            ? { background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)" }
            : match.myPick.result === "loss"
            ? { background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.2)" }
            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold"
              style={{ color: match.myPick.result === "win" ? "#00e676" : match.myPick.result === "loss" ? "#ff5252" : "rgba(255,255,255,0.6)" }}>
              {match.myPick.result === "win" ? "✅ Bạn đoán đúng" : match.myPick.result === "loss" ? "❌ Bạn đoán sai" : "🎯 Dự đoán của bạn"}
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {match.myPick.betType === "exact"
                ? `Tỉ số: ${match.myPick.homeScore ?? 0}–${match.myPick.awayScore ?? 0}`
                : match.myPick.betType === "ou"
                ? (match.myPick.side === "over" ? "Tổng bàn → Trên" : "Tổng bàn → Dưới")
                : `Kèo chấp → ${match.myPick.side === "home" ? match.homeTeam : match.myPick.side === "away" ? match.awayTeam : "Hòa"}`}
              {" · "}{"⭐".repeat(match.myPick.confidence)}
            </div>
          </div>
          {match.myPick.result && (
            <div className="text-sm font-black flex-shrink-0"
              style={{ color: match.myPick.result === "win" ? "#00e676" : "#ff5252" }}>
              {match.myPick.points > 0 ? `+${match.myPick.points}` : match.myPick.points} xu
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {/* Consensus */}
        <div className="glass rounded-2xl p-4">
          <h3 className="font-bold text-white/70 mb-4 flex items-center gap-2 text-sm">
            <BarChart3 size={15} /> Đồng thuận hội{!match.blindModeActive && ` (${match.predictorsCount} người)`}
          </h3>

          {match.blindModeActive ? (
            <div className="rounded-xl p-4 text-center"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)" }}>
              <p className="text-sm font-bold" style={{ color: "#a78bfa" }}>Blind mode đang bật</p>
              <p className="text-xs text-white/35 mt-1">Tỉ lệ và lựa chọn của hội sẽ mở sau kickoff.</p>
            </div>
          ) : match.consensus ? (
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

        {/* Predictors */}
        {(match.predictors.length > 0 || match.nonPredictors.length > 0) && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Flame size={13} className="text-orange-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Đã đoán ({match.predictors.length})
              </span>
            </div>

            {match.predictors.length > 0 ? (
              <div className="space-y-2 mb-4">
                {match.predictors.map((p, i) => {
                  const pickLabel = p.betType === "exact"
                    ? `Tỉ số: ${p.homeScore ?? 0}–${p.awayScore ?? 0}`
                    : p.betType === "ou"
                    ? (p.side === "over" ? "Trên" : "Dưới")
                    : p.side === "home" ? match.homeTeam : p.side === "away" ? match.awayTeam : "Hòa"
                  const betLabel = p.betType === "ah" ? "Chấp" : p.betType === "ou" ? "Tổng bàn" : p.betType === "exact" ? "Tỉ số" : p.betType.toUpperCase()
                  return (
                    <div key={i} className="flex items-center gap-3 py-1">
                      <span className="text-xs font-black text-white/25 w-5 flex-shrink-0">#{i+1}</span>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}>
                        {p.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          {p.name}
                          {p.streak > 0 && <span className="text-orange-400 inline-flex items-center gap-0.5"><Flame size={9}/>{p.streak}</span>}
                        </div>
                        <div className="text-[10px] text-white/35 truncate">
                          {betLabel} · {pickLabel}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[11px] text-[#ffd700]">{"⭐".repeat(p.confidence)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-white/30 mb-4">Chưa có ai đoán</p>
            )}

            {match.nonPredictors.length > 0 && (
              <>
                <div className="border-t border-white/5 pt-3 mb-2">
                  <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">
                    Chưa đoán ({match.nonPredictors.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {match.nonPredictors.map((u, i) => (
                    <div key={i} className="flex items-center gap-3 py-0.5 opacity-50">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                        {u.avatar}
                      </div>
                      <span className="text-xs text-white/40 truncate">{u.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Hope Star Table */}
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

        {/* Weather + Venue */}
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
      </div>

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
