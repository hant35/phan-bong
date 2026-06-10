import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { NotificationsView } from "./view"

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { match: { select: { id: true, homeTeam: true, awayTeam: true } } },
  })

  return <NotificationsView notifications={notifications.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    matchId: n.match?.id ?? null,
    createdAt: n.createdAt.toISOString(),
  }))} />
}
