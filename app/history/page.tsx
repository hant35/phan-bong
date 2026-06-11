import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { HistoryView } from "./view"

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const picks = await prisma.prediction.findMany({
    where: { userId: user.id },
    include: { match: true },
    orderBy: { createdAt: "desc" },
  })

  const data = picks.map(p => ({
    id: p.id,
    match: `${p.match.homeTeam} vs ${p.match.awayTeam}`,
    homeFlag: p.match.homeFlag, awayFlag: p.match.awayFlag,
    pickLabel: p.betType === "exact" ? `Tỉ số ${p.homeScore}-${p.awayScore}` :
               p.betType === "ou" ? (p.side === "over" ? `Trên (>${p.match.ouLine})` : `Dưới (≤${p.match.ouLine})`) :
               p.betType === "ah" ? `Chấp → ${p.side === "home" ? p.match.homeTeam : p.match.awayTeam}` :
               `1X2 → ${p.side === "home" ? p.match.homeTeam : p.side === "away" ? p.match.awayTeam : "Hòa"}`,
    betType: p.betType,
    confidence: p.confidence,
    result: p.result ?? (p.match.status === "live" ? "live" : "pending"),
    points: p.points,
    actualScore: p.match.scoreHome !== null ? `${p.match.scoreHome}-${p.match.scoreAway}` : null,
  }))

  return <HistoryView picks={data} />
}
