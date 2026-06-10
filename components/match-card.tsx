"use client"

import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { flagUrl, formatCountdown, formatDateTimeParts } from "@/lib/format"

export interface MatchCardData {
  id: string
  homeTeam: string
  awayTeam: string
  homeFlag: string
  awayFlag: string
  homeColor?: string | null
  awayColor?: string | null
  kickoffAt: Date | string
  stage: string
  status: string
  scoreHome?: number | null
  scoreAway?: number | null
  minute?: number | null
  ahLine?: number | null
  ouLine?: number | null
  myPick?: { betType: string; result?: string | null; points?: number } | null
  consensus?: { home: number; draw?: number; away: number } | null
  predictorsCount?: number
}

export function MatchCard({ match }: { match: MatchCardData }) {
  const kickoff = typeof match.kickoffAt === "string" ? new Date(match.kickoffAt) : match.kickoffAt
  const countdown = formatCountdown(kickoff)
  const isUrgent = match.status === "scheduled" && kickoff.getTime() - Date.now() < 15 * 60 * 1000

  const bg = match.status === "live"
    ? `linear-gradient(135deg, ${match.homeColor ?? "#1a1d2e"}22 0%, #1a1d2e 40%, ${match.awayColor ?? "#1a1d2e"}22 100%)`
    : "rgba(26,29,46,0.8)"

  const c = match.consensus

  return (
    <Link href={`/matches/${match.id}`}>
      <div className={cn(
        "relative overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-xl cursor-pointer group",
        match.status === "live"
          ? "border-[#00e676]/30 shadow-lg shadow-[#00e676]/5 glow"
          : "border-white/6 hover:border-white/15"
      )} style={{ background: bg }}>

        <div className="absolute top-3 right-3 z-10">
          {match.status === "live" && (
            <div className="flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
              <span className="live-dot w-1.5 h-1.5 bg-white rounded-full inline-block" />
              LIVE {match.minute}&apos;
            </div>
          )}
          {match.status === "finished" && <div className="text-xs text-white/30 font-medium">Kết thúc</div>}
          {match.status === "scheduled" && (
            <div className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              isUrgent ? "bg-orange-500/20 text-orange-400 animate-pulse" : "bg-white/5 text-white/40"
            )}>
              {isUrgent ? `⚡ ${countdown}` : formatDateTimeParts(kickoff).time}
            </div>
          )}
        </div>

        <div className="px-4 pt-3 pb-0">
          <span className="text-[11px] text-white/30 font-medium tracking-wide uppercase">{match.stage}</span>
        </div>

        <div className="flex items-center px-4 py-3 gap-3">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative w-12 h-8 rounded-lg overflow-hidden ring-1 ring-white/10 flex-shrink-0">
              <Image src={flagUrl(match.homeFlag)} alt={match.homeTeam} fill className="object-cover" unoptimized />
            </div>
            <div className="font-bold text-white text-sm leading-tight">{match.homeTeam}</div>
          </div>

          <div className="text-center flex-shrink-0 w-20">
            {match.status !== "scheduled" ? (
              <div className="score-font text-3xl font-black text-white">
                {match.scoreHome} <span className="text-white/30">–</span> {match.scoreAway}
              </div>
            ) : (
              <div className="text-center">
                <div className="text-white/50 text-xs font-bold">{formatDateTimeParts(kickoff).time}</div>
                <div className="text-white/30 text-[11px] mt-0.5">{formatDateTimeParts(kickoff).date}</div>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="font-bold text-white text-sm leading-tight text-right">{match.awayTeam}</div>
            <div className="relative w-12 h-8 rounded-lg overflow-hidden ring-1 ring-white/10 flex-shrink-0">
              <Image src={flagUrl(match.awayFlag)} alt={match.awayTeam} fill className="object-cover" unoptimized />
            </div>
          </div>
        </div>

        {c && (
          <div className="mx-4 pb-3">
            <div className="flex justify-between text-[10px] text-white/30 mb-1">
              <span className="font-semibold" style={{ color: match.homeColor ?? "#00e676" }}>{c.home}%</span>
              {c.draw !== undefined && c.draw > 0 && <span style={{ color: "#ffd700" }}>{c.draw}% hòa</span>}
              <span className="font-semibold" style={{ color: match.awayColor ?? "#00bcd4" }}>{c.away}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full transition-all" style={{ width: `${c.home}%`, background: match.homeColor ?? "#00e676" }} />
              {c.draw !== undefined && c.draw > 0 && <div className="h-full transition-all" style={{ width: `${c.draw}%`, background: "#ffd700" }} />}
              <div className="h-full transition-all" style={{ width: `${c.away}%`, background: match.awayColor ?? "#00bcd4" }} />
            </div>
            {match.predictorsCount !== undefined && (
              <div className="text-[10px] text-white/45 mt-1 text-center">{match.predictorsCount} người đã đoán</div>
            )}
          </div>
        )}

        <div className="mx-4 pb-3 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
          <div className="flex gap-3 text-xs text-white/30">
            {match.ahLine !== null && match.ahLine !== undefined && (
              <span>Chấp <strong className="text-white/50">{match.ahLine > 0 ? `+${match.ahLine}` : match.ahLine}</strong></span>
            )}
            {match.ouLine !== null && match.ouLine !== undefined && (
              <span>T/X <strong className="text-white/50">{match.ouLine}</strong></span>
            )}
          </div>

          {match.status === "scheduled" && (
            match.myPick ? (
              <div className="flex items-center gap-1 text-[#00e676] text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] inline-block" /> Đã đoán
              </div>
            ) : (
              <div className={cn("text-xs font-semibold rounded-full px-2 py-0.5",
                isUrgent ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-white/30"
              )}>
                {isUrgent ? "Đoán ngay!" : "Chưa đoán"}
              </div>
            )
          )}
          {match.status === "live" && match.myPick && <div className="text-xs text-[#00e676]/70 font-medium">Đang theo dõi...</div>}
          {match.status === "finished" && match.myPick?.result && (
            <div className={cn("text-xs font-black px-2 py-0.5 rounded-full",
              match.myPick.result === "win" ? "bg-[#00e676]/15 text-[#00e676]" : "bg-red-500/15 text-red-400"
            )}>
              {(match.myPick.points ?? 0) > 0 ? `+${match.myPick.points}` : match.myPick.points} xu
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
