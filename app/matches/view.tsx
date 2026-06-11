"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { MatchCard, MatchCardData } from "@/components/match-card"
import { cn } from "@/lib/utils"
import { formatDayGroupLabel, getDayKey } from "@/lib/format"

const filters = ["Tất cả", "Hôm nay", "Chưa đoán", "Live", "Đã kết thúc"]

export function MatchesView({ matches, myPickedCount, userPoints }: {
  matches: MatchCardData[]
  myPickedCount: number
  userPoints: number
}) {
  const [activeFilter, setActiveFilter] = useState("Tất cả")
  const [search, setSearch] = useState("")

  const filtered = matches.filter(m => {
    const matchesSearch = search === "" ||
      m.homeTeam.toLowerCase().includes(search.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      activeFilter === "Tất cả" ||
      (activeFilter === "Live" && m.status === "live") ||
      (activeFilter === "Đã kết thúc" && m.status === "finished") ||
      (activeFilter === "Chưa đoán" && m.status === "scheduled" && !m.myPick) ||
      (activeFilter === "Hôm nay" && (() => {
        const d = new Date(m.kickoffAt)
        const today = new Date()
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
      })())
    return matchesSearch && matchesFilter
  })

  const liveMatch = matches.find(m => m.status === "live")
  const winRate = matches.filter(m => m.myPick?.result === "win").length
  const total = matches.filter(m => m.myPick?.result).length
  const winPct = total > 0 ? Math.round(winRate / total * 100) : 0

  const groupedByDay = useMemo(() => {
    const map = new Map<string, MatchCardData[]>()
    for (const m of filtered) {
      const key = getDayKey(m.kickoffAt)
      const list = map.get(key) ?? []
      list.push(m)
      map.set(key, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  return (
    <div>
      <div className="relative rounded-3xl overflow-hidden mb-6 h-52" style={{
        background: "linear-gradient(135deg, #0a2e1a 0%, #0d1f2d 50%, #0a1a2e 100%)"
      }}>
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice">
          <rect x="0" y="0" width="800" height="300" fill="none" stroke="#00e676" strokeWidth="2"/>
          <circle cx="400" cy="150" r="80" fill="none" stroke="#00e676" strokeWidth="2"/>
          <circle cx="400" cy="150" r="6" fill="#00e676"/>
          <line x1="400" y1="0" x2="400" y2="300" stroke="#00e676" strokeWidth="1.5"/>
          <rect x="0" y="80" width="120" height="140" fill="none" stroke="#00e676" strokeWidth="1.5"/>
          <rect x="680" y="80" width="120" height="140" fill="none" stroke="#00e676" strokeWidth="1.5"/>
        </svg>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #00e676 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs font-bold text-[#00e676] uppercase tracking-widest mb-1">
                🏆 World Cup 2026
              </div>
              <h1 className="text-2xl font-black text-white leading-tight">
                Phán đúng.<br />
                <span style={{ color: "#00e676" }}>Lên ngôi.</span>
              </h1>
            </div>
            {liveMatch && (
              <div className="glass rounded-2xl px-3 py-2 text-right">
                <div className="flex items-center gap-1.5 justify-end mb-1">
                  <span className="live-dot w-2 h-2 bg-red-500 rounded-full inline-block" />
                  <span className="text-red-400 text-xs font-black">ĐANG LIVE</span>
                </div>
                <div className="text-white font-bold text-sm">
                  {liveMatch.homeTeam} <span className="text-[#00e676]">{liveMatch.scoreHome}–{liveMatch.scoreAway}</span> {liveMatch.awayTeam}
                </div>
                <div className="text-white/40 text-xs mt-0.5">Phút {liveMatch.minute}&apos;</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Đã đoán", value: `${myPickedCount}/${matches.length}`, gradient: "linear-gradient(135deg, #00e676, #00bcd4)" },
          { label: "Xu (các hội)", value: `${userPoints}`, gradient: "linear-gradient(135deg, #ffd700, #ff8f00)" },
          { label: "Tỉ lệ đúng", value: `${winPct}%`, gradient: "linear-gradient(135deg, #7c3aed, #ec4899)" },
        ].map(({ label, value, gradient }) => (
          <div key={label} className="glass rounded-2xl p-3 text-center relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-full" style={{ background: gradient }} />
            <div className="text-xl font-black text-white">{value}</div>
            <div className="text-xs text-white/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input type="text" placeholder="Tìm đội bóng..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#00e676]/30 transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 hide-scrollbar">
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={cn("flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all",
              activeFilter === f ? "text-[#0f1117] font-bold" : "text-white/40 hover:text-white/70"
            )}
            style={activeFilter === f
              ? { background: "linear-gradient(135deg, #00e676, #00bcd4)" }
              : { background: "rgba(255,255,255,0.05)" }}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/45">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-medium">Không tìm thấy trận nào</p>
          </div>
        ) : groupedByDay.map(([dayKey, dayMatches]) => (
          <section key={dayKey}>
            <div className="flex items-center gap-2 mb-2 px-0.5 sticky top-0 z-10 py-1"
              style={{ background: "linear-gradient(to bottom, #0f1117 70%, transparent)" }}>
              <h2 className="text-sm font-black text-white">{formatDayGroupLabel(dayMatches[0].kickoffAt)}</h2>
              <span className="text-[10px] font-semibold text-white/30 px-1.5 py-px rounded-full"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                {dayMatches.length} trận
              </span>
            </div>
            <div className="space-y-1.5">
              {dayMatches.map((match, i) => (
                <div key={match.id} className="fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <MatchCard match={match} compact />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
