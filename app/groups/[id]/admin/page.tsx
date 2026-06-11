import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { GroupAdminView } from "./view"

export default async function GroupAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const isSuperAdmin = user.role === "superadmin"

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: id } },
  })
  if (!isSuperAdmin && (!membership || (membership.role !== "owner" && membership.role !== "admin"))) {
    redirect(`/groups/${id}`)
  }

  const group = await prisma.group.findUnique({
    where: { id },
    include: { admin: { select: { id: true, name: true } } },
  })
  if (!group) notFound()

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    orderBy: [{ role: "asc" }, { points: "desc" }],
    include: {
      user: { select: { id: true, name: true, avatar: true, email: true } },
    },
  })

  const predCounts = await prisma.prediction.groupBy({
    by: ["userId"],
    where: { groupId: id },
    _count: { id: true },
  })
  const predMap: Record<string, number> = {}
  for (const p of predCounts) predMap[p.userId] = p._count.id

  const upcomingMatches = await prisma.match.findMany({
    where: {
      status: "scheduled",
      kickoffAt: { gt: new Date(Date.now() + 30 * 60 * 1000) },
    },
    orderBy: { kickoffAt: "asc" },
    take: 20,
    select: { id: true, homeTeam: true, awayTeam: true, homeFlag: true, awayFlag: true, kickoffAt: true, ahLine: true, ouLine: true },
  })

  const groupConfigs = await prisma.groupMatchConfig.findMany({
    where: { groupId: id },
    select: { matchId: true, ahLine: true, ouLine: true, allowedBetTypes: true, pointsMultiplier: true, lockMinutes: true, blindMode: true, updatedAt: true },
  })
  const configMap: Record<string, {
    ahLine: number | null; ouLine: number | null; allowedBetTypes: string[]
    pointsMultiplier: number; lockMinutes: number; blindMode: boolean; updatedAt: string
  }> = {}
  for (const c of groupConfigs) {
    configMap[c.matchId] = {
      ahLine: c.ahLine,
      ouLine: c.ouLine,
      allowedBetTypes: JSON.parse(c.allowedBetTypes),
      pointsMultiplier: c.pointsMultiplier,
      lockMinutes: c.lockMinutes,
      blindMode: c.blindMode,
      updatedAt: c.updatedAt.toISOString(),
    }
  }

  // Lịch sử mùa giải
  const seasons = await prisma.groupSeason.findMany({
    where: { groupId: id },
    orderBy: { startedAt: "desc" },
  })

  return <GroupAdminView
    group={{ id: group.id, name: group.name, visibility: group.visibility, inviteCode: group.inviteCode }}
    currentUserId={user.id}
    myRole={(isSuperAdmin ? (membership?.role ?? "owner") : membership!.role) as "owner" | "admin"}
    members={members.map(m => ({
      userId: m.userId,
      name: m.user.name,
      avatar: m.user.avatar ?? "??",
      email: m.user.email,
      role: m.role as "owner" | "admin" | "member",
      points: m.points,
      wins: m.wins,
      losses: m.losses,
      predCount: predMap[m.userId] ?? 0,
      joinedAt: m.joinedAt.toISOString(),
    }))}
    upcomingMatches={upcomingMatches.map(m => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeFlag: m.homeFlag,
      awayFlag: m.awayFlag,
      kickoffAt: m.kickoffAt.toISOString(),
      globalAhLine: m.ahLine,
      globalOuLine: m.ouLine,
      config: configMap[m.id] ?? null,
    }))}
    seasons={seasons.map(s => ({
      id: s.id,
      name: s.name,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      standings: JSON.parse(s.snapshot),
    }))}
  />
}
