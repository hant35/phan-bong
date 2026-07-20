"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

const ROUND_SHORT: Record<string, string> = {
  "Vòng bảng": "VB",
  "Vòng 32": "V32",
  "Vòng 16": "V16",
  "Tứ kết": "TK",
  "Bán kết": "BK",
  "Tranh hạng ba": "T3",
  "Chung kết": "CK",
}

interface RoundStat { wins: number; losses: number; skips: number; pending: number }
interface Row {
  userId: string; name: string; displayName: string | null; avatar: string; isMe: boolean
  byRound: Record<string, RoundStat>
  totals: { wins: number; losses: number; skips: number; graded: number; winRate: number }
}

export function GroupStatsView({ groupId, groupName, rounds, rows }: {
  groupId: string; groupName: string; rounds: readonly string[]; rows: Row[]
}) {
  const [sortMode, setSortMode] = useState<"winRate" | "wins" | "losses" | "skips">("winRate")

  const sorted = [...rows].sort((a, b) => {
    if (sortMode === "winRate") return b.totals.winRate - a.totals.winRate || b.totals.wins - a.totals.wins
    if (sortMode === "wins") return b.totals.wins - a.totals.wins || a.totals.losses - b.totals.losses
    if (sortMode === "losses") return b.totals.losses - a.totals.losses
    return b.totals.skips - a.totals.skips
  })

  return (
    <div className="space-y-4">
      <Link href={`/groups/${groupId}`}
        className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60">
        <ArrowLeft size={15}/> {groupName}
      </Link>

      <div className="rounded-3xl p-5"
        style={{ background: "linear-gradient(135deg, #0d1f2d 0%, #1a1530 50%, #0a2e1a 100%)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={14} className="text-[#00bcd4]"/>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#00bcd4]">Thống kê chi tiết</span>
        </div>
        <h1 className="text-2xl font-black text-white">Đúng · Sai · Bỏ theo vòng</h1>
        <p className="text-sm text-white/40 mt-1">
          {rows.length} thành viên · {rounds.length} vòng đấu
        </p>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto hide-scrollbar"
        style={{ background: "rgba(255,255,255,0.03)" }}>
        {([
          { key: "winRate", label: "% Đúng", icon: Trophy, color: "#ffd700" },
          { key: "wins",    label: "Đúng nhất", icon: TrendingUp, color: "#00e676" },
          { key: "losses",  label: "Sai nhất", icon: TrendingDown, color: "#ff5252" },
          { key: "skips",   label: "Hay bỏ", icon: Minus, color: "#8b8fa8" },
        ] as const).map(({ key, label, icon: Icon, color }) => (
          <button key={key} onClick={() => setSortMode(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex-shrink-0",
              sortMode === key ? "text-white" : "text-white/30"
            )}
            style={sortMode === key ? { background: "rgba(255,255,255,0.08)", color } : {}}>
            <Icon size={13}/> {label}
          </button>
        ))}
      </div>

      {/* Bảng thống kê */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th className="sticky left-0 z-10 text-left px-3 py-2.5 font-bold text-white/60 whitespace-nowrap"
                  style={{ background: "#181a24" }}>Thành viên</th>
                {rounds.map(r => (
                  <th key={r} className="px-2 py-2.5 font-bold text-white/60 text-center whitespace-nowrap"
                    title={r}>{ROUND_SHORT[r] ?? r}</th>
                ))}
                <th className="px-3 py-2.5 font-bold text-white/80 text-center whitespace-nowrap"
                  style={{ background: "rgba(255,215,0,0.06)" }}>Tổng</th>
                <th className="px-3 py-2.5 font-bold text-[#ffd700] text-center whitespace-nowrap"
                  style={{ background: "rgba(255,215,0,0.06)" }}>%</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => (
                <tr key={r.userId}
                  className={cn(
                    "border-t border-white/[0.03]",
                    r.isMe && "bg-[#00e676]/[0.04]"
                  )}>
                  <td className="sticky left-0 z-10 px-3 py-2 whitespace-nowrap"
                    style={{ background: r.isMe ? "#1a2620" : "#181a24" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/25 w-4">{idx + 1}</span>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }}>
                        {r.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate max-w-[110px]">
                          {r.name}{r.isMe && <span className="text-[9px] text-[#00e676] ml-1">(bạn)</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  {rounds.map(round => {
                    const s = r.byRound[round]
                    const empty = s.wins === 0 && s.losses === 0 && s.skips === 0 && s.pending === 0
                    return (
                      <td key={round} className="px-2 py-2 text-center align-middle">
                        {empty ? (
                          <span className="text-white/15">—</span>
                        ) : (
                          <div className="inline-flex flex-col items-center gap-0.5 leading-tight">
                            <div className="flex items-center gap-1 font-black text-[11px]">
                              <span className="text-[#00e676]">{s.wins}</span>
                              <span className="text-white/15">/</span>
                              <span className="text-[#ff5252]">{s.losses}</span>
                              {s.skips > 0 && (
                                <>
                                  <span className="text-white/15">/</span>
                                  <span className="text-white/40">{s.skips}</span>
                                </>
                              )}
                            </div>
                            {s.pending > 0 && (
                              <span className="text-[8px] text-[#ff8f00]">{s.pending} chờ</span>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center align-middle whitespace-nowrap"
                    style={{ background: r.isMe ? "rgba(255,215,0,0.08)" : "rgba(255,215,0,0.03)" }}>
                    <div className="flex items-center justify-center gap-1 font-black text-[11px]">
                      <span className="text-[#00e676]">{r.totals.wins}</span>
                      <span className="text-white/15">/</span>
                      <span className="text-[#ff5252]">{r.totals.losses}</span>
                      {r.totals.skips > 0 && (
                        <>
                          <span className="text-white/15">/</span>
                          <span className="text-white/40">{r.totals.skips}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center align-middle whitespace-nowrap font-black text-sm"
                    style={{ background: r.isMe ? "rgba(255,215,0,0.08)" : "rgba(255,215,0,0.03)", color: "#ffd700" }}>
                    {r.totals.graded > 0 ? `${r.totals.winRate}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl p-3 text-[11px] text-white/40 space-y-1"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <div><span className="font-bold text-white/60">Định dạng ô:</span> <span className="text-[#00e676]">Đúng</span> / <span className="text-[#ff5252]">Sai</span> / <span className="text-white/40">Bỏ</span></div>
        <div><span className="font-bold text-white/60">Vòng:</span> VB=Vòng bảng · V32=Vòng 32 · V16=Vòng 16 · TK=Tứ kết · BK=Bán kết · T3=Tranh hạng ba · CK=Chung kết</div>
      </div>
    </div>
  )
}
