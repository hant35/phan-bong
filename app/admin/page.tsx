import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"
import { AdminView } from "./view"

export default async function AdminPage() {
  const admin = await requireAdmin()
  if (!admin) redirect("/login")

  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: { _count: { select: { predictions: true } } },
  })

  const groups = await prisma.group.findMany({
    include: {
      admin: { select: { id: true, name: true } },
      _count: { select: { members: true } },
      members: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { points: "desc" },
      },
    },
  })

  const [users, pointSums] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, avatar: true, role: true,
        email: true, googleId: true, createdAt: true,
        _count: { select: { predictions: true, memberships: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.groupMember.groupBy({
      by: ["userId"],
      _sum: { points: true },
    }),
  ])
  const groupPointsByUser = new Map(pointSums.map(p => [p.userId, p._sum.points ?? 0]))

  return <AdminView
    matches={matches.map(m => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeFlag: m.homeFlag,
      awayFlag: m.awayFlag,
      kickoffAt: m.kickoffAt.toISOString(),
      stage: m.stage,
      status: m.status,
      scoreHome: m.scoreHome,
      scoreAway: m.scoreAway,
      minute: m.minute,
      ahLine: m.ahLine,
      ouLine: m.ouLine,
      predictionsCount: m._count.predictions,
    }))}
    groups={groups.map(g => ({
      id: g.id,
      name: g.name,
      visibility: g.visibility,
      inviteCode: g.inviteCode,
      adminId: g.admin.id,
      adminName: g.admin.name,
      memberCount: g._count.members,
      members: g.members.map(m => ({
        userId: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar ?? "??",
        points: m.points,
      })),
    }))}
    users={users.map(u => ({
      id: u.id, name: u.name, avatar: u.avatar, role: u.role,
      email: u.email,
      hasGoogle: !!u.googleId,
      groupPointsSum: groupPointsByUser.get(u.id) ?? 0,
      predictionCount: u._count.predictions,
      groupCount: u._count.memberships,
      createdAt: u.createdAt.toISOString(),
    }))}
  />
}
