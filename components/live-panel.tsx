"use client"

import { useState, useEffect, useCallback } from "react"
import { Trophy, TrendingUp, TrendingDown, BarChart3, Users, Zap, SkipForward } from "lucide-react"
import { BET_TYPE_LABEL } from "@/lib/format"

interface LiveData {
  matchId: string
  status: string
  scoreHome: number | null
  scoreAway: number | null
  minute: number | null
  totalPredictions: number
  stats: {
    ah: { home: number; away: number }
    ou: { over: number; under: number }
    "1x2": { home: number; draw: number; away: number }
    exact: { count: number }
  }
  grading: {
    wins: number
    losses: number
    winPercent: number
    lossPercent: number
    details: { name: string; betType: string; result: "win" | "loss"; reason: string }[]
  } | null
  predictions: { userName: string; avatar: string | null; betType: string; side: string | null; homeScore: number | null; awayScore: number | null }[]
}

interface Props {
  matchId: string
  homeTeam: string
  awayTeam: string
  status: string
  compact?: boolean // for homepage mini card
}

export function LivePanel({ matchId, homeTeam, awayTeam, status, compact = false }: Props) {
  const [data, setData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/live`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    fetchLive()
    // Auto-refresh every 30s for live matches
    if (status === "live") {
      const interval = setInterval(fetchLive, 30000)
      return () => clearInterval(interval)
    }
  }, [fetchLive, status])

  if (loading || !data) return null
  if (data.totalPredictions === 0 && !data.grading) return null

  // ── Compact mode (homepage) ──
  if (compact) {
    return (
      <div className="flex items-center gap-3 mt-2">
        {data.grading && (
          <>
            <div className="flex items-center gap-1">
              <TrendingUp size={12} className="text-[#00e676]" />
              <span className="text-[10px] font-bold text-[#00e676]">{data.grading.winPercent}%</span>
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#00e676] to-[#00e676]/50"
                style={{ width: `${data.grading.winPercent}%` }} />
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown size={12} className="text-red-400" />
              <span className="text-[10px] font-bold text-red-400">{data.grading.lossPercent}%</span>
            </div>
          </>
        )}
        <span className="text-[10px] text-white/30">{data.totalPredictions} đoán</span>
      </div>
    )
  }

  // ── Full mode (match detail page) ──
  return (
    <div className="rounded-2xl border border-white/6 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <BarChart3 size={16} className="text-[#ffd700]" />
        <span className="text-sm font-bold text-white">
          {status === "live" ? "Thống kê LIVE" : status === "finished" ? "Kết quả chấm điểm" : "Thống kê dự đoán"}
        </span>
        {status === "live" && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-red-400 font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> LIVE
          </span>
        )}
        <span className="text-[10px] text-white/30 ml-auto">{data.totalPredictions} dự đoán</span>
      </div>

      {/* Win/Loss bar */}
      {data.grading && data.totalPredictions > 0 && (
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-[#00e676]" />
              <span className="text-xs font-bold text-[#00e676]">{data.grading.wins} đúng ({data.grading.winPercent}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-red-400">{data.grading.losses} sai ({data.grading.lossPercent}%)</span>
              <TrendingDown size={14} className="text-red-400" />
            </div>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden flex">
            {data.grading.winPercent > 0 && (
              <div className="h-full bg-gradient-to-r from-[#00e676] to-[#00e676]/70 transition-all duration-500"
                style={{ width: `${data.grading.winPercent}%` }} />
            )}
            {data.grading.lossPercent > 0 && (
              <div className="h-full bg-gradient-to-r from-red-400/70 to-red-400 transition-all duration-500"
                style={{ width: `${data.grading.lossPercent}%` }} />
            )}
          </div>
        </div>
      )}

      {/* Prediction distribution */}
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[10px] text-white/30 uppercase font-bold mb-2">Phân bổ dự đoán</p>
        <div className="grid grid-cols-2 gap-3">
          {/* AH */}
          {(data.stats.ah.home + data.stats.ah.away) > 0 && (
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
              <p className="text-[10px] text-white/40 font-bold mb-2">⚖️ Kèo chấp</p>
              <div className="space-y-1.5">
                <StatBar label={homeTeam} count={data.stats.ah.home} total={data.stats.ah.home + data.stats.ah.away} color="#4fc3f7" />
                <StatBar label={awayTeam} count={data.stats.ah.away} total={data.stats.ah.home + data.stats.ah.away} color="#ff8a80" />
              </div>
            </div>
          )}
          {/* OU */}
          {(data.stats.ou.over + data.stats.ou.under) > 0 && (
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
              <p className="text-[10px] text-white/40 font-bold mb-2">📊 Tài/Xỉu</p>
              <div className="space-y-1.5">
                <StatBar label="Tài" count={data.stats.ou.over} total={data.stats.ou.over + data.stats.ou.under} color="#ffd700" />
                <StatBar label="Xỉu" count={data.stats.ou.under} total={data.stats.ou.over + data.stats.ou.under} color="#b388ff" />
              </div>
            </div>
          )}
          {/* 1X2 */}
          {(data.stats["1x2"].home + data.stats["1x2"].draw + data.stats["1x2"].away) > 0 && (
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
              <p className="text-[10px] text-white/40 font-bold mb-2">🏆 1X2</p>
              <div className="space-y-1.5">
                <StatBar label={homeTeam} count={data.stats["1x2"].home} total={data.stats["1x2"].home + data.stats["1x2"].draw + data.stats["1x2"].away} color="#4fc3f7" />
                <StatBar label="Hòa" count={data.stats["1x2"].draw} total={data.stats["1x2"].home + data.stats["1x2"].draw + data.stats["1x2"].away} color="#ffd700" />
                <StatBar label={awayTeam} count={data.stats["1x2"].away} total={data.stats["1x2"].home + data.stats["1x2"].draw + data.stats["1x2"].away} color="#ff8a80" />
              </div>
            </div>
          )}
          {/* Exact */}
          {data.stats.exact.count > 0 && (
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
              <p className="text-[10px] text-white/40 font-bold mb-2">🎯 Tỉ số chính xác</p>
              <p className="text-sm font-bold text-white">{data.stats.exact.count} <span className="text-white/30 text-xs">người đoán</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Grading details (who won/lost) */}
      {data.grading && data.grading.details.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] text-white/30 uppercase font-bold mb-2">
            {status === "finished" ? "Kết quả chính thức" : "Kết quả tạm thời"}
          </p>
          <div className="space-y-1.5">
            {data.grading.details.map((d, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                style={{ background: d.result === "win" ? "rgba(0,230,118,0.06)" : "rgba(255,82,82,0.06)" }}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${d.result === "win" ? "bg-[#00e676]/20 text-[#00e676]" : "bg-red-500/20 text-red-400"}`}>
                  {d.result === "win" ? "✓" : "✗"}
                </span>
                <span className="text-xs font-medium text-white flex-1 truncate">{d.name}</span>
                <span className="text-[10px] text-white/30">{BET_TYPE_LABEL[d.betType] || d.betType}</span>
                <span className={`text-[10px] font-bold ${d.result === "win" ? "text-[#00e676]" : "text-red-400"}`}>
                  {d.result === "win" ? "+1" : "0"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stat bar helper ──
function StatBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/50 w-16 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold w-8 text-right" style={{ color }}>{pct}%</span>
    </div>
  )
}
