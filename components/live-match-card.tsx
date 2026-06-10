"use client"

import { LivePanel } from "@/components/live-panel"

export function LiveMatchBar({ matchId, homeTeam, awayTeam }: { matchId: string; homeTeam: string; awayTeam: string }) {
  return <LivePanel matchId={matchId} homeTeam={homeTeam} awayTeam={awayTeam} status="live" compact />
}
