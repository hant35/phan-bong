import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { MatchDetailView } from "./view"

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const m = await prisma.match.findUnique({
    where: { id },
    include: {
      predictions: {
        include: { user: { select: { id: true, name: true, avatar: true, streak: true } } },
        orderBy: { confidence: "desc" },
      },
    },
  })
  if (!m) notFound()

  const total = m.predictions.length || 1
  const home = m.predictions.filter(p => p.side === "home" || (p.betType === "exact" && (p.homeScore ?? 0) > (p.awayScore ?? 0))).length
  const away = m.predictions.filter(p => p.side === "away" || (p.betType === "exact" && (p.homeScore ?? 0) < (p.awayScore ?? 0))).length
  const draw = m.predictions.length - home - away

  const commentCount = await prisma.comment.count({ where: { matchId: id } })

  const userMemberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: { group: { select: { id: true, name: true } } },
  })
  const isInGroup = userMemberships.length > 0
  const userGroups = userMemberships.map(mem => ({ id: mem.group.id, name: mem.group.name }))

  // Lấy pick của user từ group đầu tiên
  const firstGroupId = userGroups[0]?.id
  const myPick = m.predictions.find(p => p.userId === user.id && (!firstGroupId || p.groupId === firstGroupId))

  const data = {
    id: m.id,
    homeTeam: m.homeTeam, awayTeam: m.awayTeam,
    homeFlag: m.homeFlag, awayFlag: m.awayFlag,
    homeColor: m.homeColor, awayColor: m.awayColor,
    kickoffAt: m.kickoffAt.toISOString(), stage: m.stage, venue: m.venue,
    status: m.status, scoreHome: m.scoreHome, scoreAway: m.scoreAway, minute: m.minute,
    ahLine: m.ahLine, ouLine: m.ouLine,
    weather: m.weatherIcon ? { icon: m.weatherIcon, temp: m.weatherTemp, condition: m.weatherCond } : null,
    h2h: m.h2hHome !== null ? {
      home: m.h2hHome, draw: m.h2hDraw, away: m.h2hAway,
      recent: m.h2hRecent ? (m.h2hRecent.startsWith("[") ? JSON.parse(m.h2hRecent) : m.h2hRecent.split("")) : [],
    } : null,
    consensus: m.predictions.length > 0 ? {
      home: Math.round(home / total * 100),
      draw: Math.round(draw / total * 100),
      away: Math.round(away / total * 100),
    } : null,
    predictorsCount: m.predictions.length,
    predictors: m.predictions.slice(0, 8).map(p => ({
      name: p.user.name, avatar: p.user.avatar ?? "??", streak: p.user.streak,
      side: p.side, betType: p.betType, confidence: p.confidence,
    })),
    myPick: myPick ? {
      betType: myPick.betType, side: myPick.side,
      homeScore: myPick.homeScore, awayScore: myPick.awayScore,
      confidence: myPick.confidence, result: myPick.result, points: myPick.points,
    } : null,
  }

  return (
    <Suspense fallback={null}>
      <MatchDetailView
        match={data}
        currentUserId={user.id}
        commentCount={commentCount}
        isInGroup={isInGroup}
        userGroups={userGroups}
      />
    </Suspense>
  )
}
