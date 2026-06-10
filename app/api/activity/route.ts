import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true, avatar: true } } },
  })
  return NextResponse.json({
    activities: activities.map(a => ({
      id: a.id, type: a.type, action: a.action, target: a.target,
      user: a.user.name, avatar: a.user.avatar, createdAt: a.createdAt,
    })),
  })
}
