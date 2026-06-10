"use client"

import { useState } from "react"
import Image from "next/image"
import { History, TrendingUp, TrendingDown, Filter, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { flagUrl, BET_TYPE_LABEL } from "@/lib/format"

const FILTERS = ["Tất cả", "Thắng", "Thua", "Đang chờ", "Live"]
const BET_TYPES = ["Tất cả kèo", "Kèo chấp", "Tài/Xỉu", "Tỉ số"]

interface Pick {
  id: string; match: string; homeFlag: string; awayFlag: string;
  pickLabel: string; betType: string; confidence: number;
  result: string; points: number; actualScore: string | null;
}

export function HistoryView({ picks }: { picks: Pick[] }) {
  const [filter, setFilter] = useState("Tất cả")
  const [betFilter, setBetFilter] = useState("Tất cả kèo")

  const filtered = picks.filter(p => {
    if (filter === "Thắng" && p.result !== "win") return false
    if (filter === "Thua" && p.result !== "loss") return false
    if (filter === "Đang chờ" && p.result !== "pending") return false
    if (filter === "Live" && p.result !== "live") return false
    if (betFilter !== "Tất cả kèo" && BET_TYPE_LABEL[p.betType] !== betFilter) return false
    return true
  })

  const wins = picks.filter(p => p.result === "win")
  const losses = picks.filter(p => p.result === "loss")
  const totalWinXu = wins.reduce((s, p) => s + p.points, 0)
  const totalLossXu = losses.reduce((s, p) => s + p.points, 0)
  const total = wins.length + losses.length

  return (
    <div className="space-y-5">
      <div className="relative rounded-3xl overflow-hidden p-5"
        style={{ background: "linear-gradient(135deg, #0d1f2d 0%, #0a2e1a 50%, #1a1530 100%)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #00bcd4 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <History size={14} className="text-[#00bcd4]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#00bcd4]">Lịch sử dự đoán</span>
          </div>
          <h1 className="text-2xl font-black text-white">Tất cả các trận đã đoán</h1>
          <p className="text-sm text-white/40 mt-1">{picks.length} dự đoán · {wins.length} thắng / {losses.length} thua</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(0,230,118,0.08), rgba(0,230,118,0.02))", border: "1px solid rgba(0,230,118,0.15)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-[#00e676]"/>
            <span className="text-[10px] font-bold text-[#00e676] uppercase tracking-widest">Thắng</span>
          </div>
          <div className="text-xl font-black text-white">+{totalWinXu}</div>
          <div className="text-[10px] text-white/30 mt-0.5">{wins.length} trận đúng</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,82,82,0.08), rgba(255,82,82,0.02))", border: "1px solid rgba(255,82,82,0.15)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} className="text-red-400"/>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Thua</span>
          </div>
          <div className="text-xl font-black text-white">{totalLossXu}</div>
          <div className="text-[10px] text-white/30 mt-0.5">{losses.length} trận sai</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,215,0,0.02))", border: "1px solid rgba(255,215,0,0.15)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 size={12} style={{ color: "#ffd700" }}/>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#ffd700" }}>Tổng</span>
          </div>
          <div className="text-xl font-black text-white">{totalWinXu + totalLossXu > 0 ? "+" : ""}{totalWinXu + totalLossXu}</div>
          <div className="text-[10px] text-white/30 mt-0.5">{total > 0 ? Math.round(wins.length / total * 100) : 0}% đúng</div>
        </div>
      </div>

      <div className="rounded-3xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-white/40" />
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Lọc</span>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all", filter === f ? "font-bold" : "")}
                style={filter === f
                  ? { background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>{f}</button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {BET_TYPES.map(f => (
              <button key={f} onClick={() => setBetFilter(f)}
                className={cn("flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  betFilter === f ? "font-bold text-white" : "text-white/40")}
                style={betFilter === f ? { background: "rgba(255,255,255,0.1)" } : { background: "rgba(255,255,255,0.03)" }}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/20">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-medium">Chưa có dự đoán nào</p>
          </div>
        ) : filtered.map(p => (
          <div key={p.id} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="w-1 h-12 rounded-full flex-shrink-0"
              style={{ background: p.result === "win" ? "#00e676" : p.result === "loss" ? "#ff5252" : p.result === "live" ? "#ff8f00" : "rgba(255,255,255,0.1)" }} />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="relative w-9 h-6 rounded overflow-hidden"><Image src={flagUrl(p.homeFlag)} alt="" fill className="object-cover" unoptimized/></div>
              <div className="relative w-9 h-6 rounded overflow-hidden"><Image src={flagUrl(p.awayFlag)} alt="" fill className="object-cover" unoptimized/></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">{p.match}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
                  {BET_TYPE_LABEL[p.betType]}
                </span>
              </div>
              <div className="text-[11px] text-white/40 mt-0.5 truncate">
                <span className="text-white/60 font-semibold">{p.pickLabel}</span>
                <span> · CF{p.confidence}</span>
                {p.actualScore && <span> · KQ {p.actualScore}</span>}
              </div>
            </div>
            <span className={cn("text-sm font-black px-2.5 py-1 rounded-xl flex-shrink-0",
              p.result === "win" ? "bg-[#00e676]/15 text-[#00e676]" :
              p.result === "loss" ? "bg-red-500/15 text-red-400" :
              p.result === "live" ? "bg-orange-500/15 text-orange-400" :
              "bg-white/5 text-white/40")}>
              {p.result === "win" ? `+${p.points}` : p.result === "loss" ? p.points : p.result === "live" ? "LIVE" : "Chờ"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
