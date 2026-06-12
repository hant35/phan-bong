import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getDefaultGroupId } from "@/lib/default-group"
import { MatchDetailView } from "./view"

type MatchDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ from?: string | string[] }>
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function groupIdFromBackUrl(backUrl: string | undefined) {
  if (!backUrl?.startsWith("/groups/")) return null
  return backUrl.split("/groups/")[1]?.split("/")[0] ?? null
}

export default async function MatchDetailPage({ params, searchParams }: MatchDetailPageProps) {
  const { id } = await params
  const query = searchParams ? await searchParams : {}
  const requestedGroupId = groupIdFromBackUrl(firstParam(query.from))
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

  const userMemberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: { group: { select: { id: true, name: true } } },
  })
  const isInGroup = userMemberships.length > 0
  const userGroups = userMemberships.map(mem => ({ id: mem.group.id, name: mem.group.name }))

  const defaultGroupId = await getDefaultGroupId(user.id)
  const fallbackGroupId = defaultGroupId && userGroups.some(g => g.id === defaultGroupId)
    ? defaultGroupId
    : userGroups[0]?.id
  const selectedGroupId = userGroups.some(g => g.id === requestedGroupId) ? requestedGroupId : fallbackGroupId
  const groupConfig = selectedGroupId ? await prisma.groupMatchConfig.findUnique({
    where: { groupId_matchId: { groupId: selectedGroupId, matchId: m.id } },
    select: { blindMode: true },
  }) : null
  const blindModeActive = !!groupConfig?.blindMode && m.status === "scheduled" && m.kickoffAt > new Date()
  const groupPredictions = selectedGroupId ? m.predictions.filter(p => p.groupId === selectedGroupId) : m.predictions
  const visiblePredictions = blindModeActive ? [] : groupPredictions
  const myPick = m.predictions.find(p => p.userId === user.id && (!selectedGroupId || p.groupId === selectedGroupId))

  const total = visiblePredictions.length || 1
  const home = visiblePredictions.filter(p => p.side === "home" || (p.betType === "exact" && (p.homeScore ?? 0) > (p.awayScore ?? 0))).length
  const away = visiblePredictions.filter(p => p.side === "away" || (p.betType === "exact" && (p.homeScore ?? 0) < (p.awayScore ?? 0))).length
  const draw = visiblePredictions.length - home - away

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
    blindModeActive,
    consensus: visiblePredictions.length > 0 ? {
      home: Math.round(home / total * 100),
      draw: Math.round(draw / total * 100),
      away: Math.round(away / total * 100),
    } : null,
    predictorsCount: visiblePredictions.length,
    predictors: visiblePredictions.slice(0, 8).map(p => ({
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
        isInGroup={isInGroup}
        userGroups={userGroups}
      />
    </Suspense>
  )
}
