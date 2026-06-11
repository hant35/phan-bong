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

function PickBadge({ match, isUrgent }: { match: MatchCardData; isUrgent: boolean }) {
  if (match.status === "scheduled") {
    if (match.myPick) {
      return (
        <span className="text-[10px] font-semibold text-[#00e676] flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-[#00e676]" /> Đã đoán
        </span>
      )
    }
    return (
      <span className={cn(
        "text-[10px] font-semibold rounded-full px-1.5 py-px",
        isUrgent ? "bg-orange-500/20 text-orange-400" : "text-white/35",
      )}>
        {isUrgent ? "Đoán ngay" : "Chưa đoán"}
      </span>
    )
  }
  if (match.status === "live" && match.myPick) {
    return <span className="text-[10px] text-[#00e676]/70">Theo dõi</span>
  }
  if (match.status === "finished" && match.myPick?.result) {
    const pts = match.myPick.points ?? 0
    return (
      <span className={cn(
        "text-[10px] font-black px-1.5 py-px rounded-full",
        match.myPick.result === "win" ? "bg-[#00e676]/15 text-[#00e676]" : "bg-red-500/15 text-red-400",
      )}>
        {pts > 0 ? `+${pts}` : pts} xu
      </span>
    )
  }
  return null
}

function StatusBadge({ match, kickoff, isUrgent, countdown }: {
  match: MatchCardData
  kickoff: Date
  isUrgent: boolean
  countdown: string
}) {
  if (match.status === "live") {
    return (
      <span className="flex items-center gap-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-px rounded-full">
        <span className="live-dot w-1 h-1 bg-white rounded-full inline-block" />
        LIVE {match.minute}&apos;
      </span>
    )
  }
  if (match.status === "finished") {
    return <span className="text-[9px] text-white/30 font-medium">KT</span>
  }
  return (
    <span className={cn(
      "text-[10px] font-semibold tabular-nums",
      isUrgent ? "text-orange-400" : "text-white/40",
    )}>
      {isUrgent ? `⚡ ${countdown}` : formatDateTimeParts(kickoff).time.split(" ")[0]}
    </span>
  )
}

export function MatchCard({ match, compact = false }: { match: MatchCardData; compact?: boolean }) {
  const kickoff = typeof match.kickoffAt === "string" ? new Date(match.kickoffAt) : match.kickoffAt
  const countdown = formatCountdown(kickoff)
  const isUrgent = match.status === "scheduled" && kickoff.getTime() - Date.now() < 15 * 60 * 1000

  const bg = match.status === "live"
    ? `linear-gradient(135deg, ${match.homeColor ?? "#1a1d2e"}22 0%, #1a1d2e 40%, ${match.awayColor ?? "#1a1d2e"}22 100%)`
    : "rgba(26,29,46,0.8)"

  if (compact) {
    return (
      <Link href={`/matches/${match.id}`}>
        <div className={cn(
          "relative overflow-hidden rounded-xl border transition-all hover:border-white/15 active:scale-[0.99] cursor-pointer",
          match.status === "live" ? "border-[#00e676]/25" : "border-white/6",
        )} style={{ background: bg }}>
          <div className="px-2.5 py-2">
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-5 rounded overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                <Image src={flagUrl(match.homeFlag)} alt={match.homeTeam} fill className="object-cover" unoptimized />
              </div>
              <span className="flex-1 min-w-0 text-[11px] font-bold text-white truncate">{match.homeTeam}</span>

              <div className="flex-shrink-0 text-center min-w-[44px]">
                {match.status !== "scheduled" ? (
                  <span className="score-font text-sm font-black text-white tabular-nums">
                    {match.scoreHome}<span className="text-white/25 mx-0.5">-</span>{match.scoreAway}
                  </span>
                ) : (
                  <span className="text-[10px] text-white/35 font-bold">vs</span>
                )}
              </div>

              <span className="flex-1 min-w-0 text-[11px] font-bold text-white truncate text-right">{match.awayTeam}</span>
              <div className="relative w-7 h-5 rounded overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                <Image src={flagUrl(match.awayFlag)} alt={match.awayTeam} fill className="object-cover" unoptimized />
              </div>
            </div>

            <div className="flex items-center justify-between mt-1.5 gap-2">
              <div className="flex items-center gap-1.5 min-w-0 text-[9px] text-white/30 truncate">
                <span className="truncate">{match.stage}</span>
                {match.ahLine != null && (
                  <span className="flex-shrink-0">· C {match.ahLine > 0 ? `+${match.ahLine}` : match.ahLine}</span>
                )}
                {match.ouLine != null && <span className="flex-shrink-0">· {match.ouLine}</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge match={match} kickoff={kickoff} isUrgent={isUrgent} countdown={countdown} />
                <PickBadge match={match} isUrgent={isUrgent} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

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
          <PickBadge match={match} isUrgent={isUrgent} />
        </div>
      </div>
    </Link>
  )
}
