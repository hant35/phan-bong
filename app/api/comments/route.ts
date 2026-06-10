import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/comments?matchId=xxx
export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId")
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 })

  const comments = await prisma.comment.findMany({
    where: { matchId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, avatar: true, displayName: true } } },
  })

  return NextResponse.json(comments)
}

// POST /api/comments { matchId, text }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { matchId, text } = await req.json()
  if (!matchId || !text?.trim()) return NextResponse.json({ error: "matchId and text required" }, { status: 400 })

  const trimmed = text.trim().slice(0, 500) // max 500 chars

  const comment = await prisma.comment.create({
    data: { userId: user.id, matchId, text: trimmed },
    include: { user: { select: { id: true, name: true, avatar: true, displayName: true } } },
  })

  // Notify other users who commented on this match (deduplicated, exclude self)
  const otherCommenters = await prisma.comment.findMany({
    where: { matchId, userId: { not: user.id } },
    select: { userId: true },
    distinct: ["userId"],
  })

  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { homeTeam: true, awayTeam: true } })

  if (match && otherCommenters.length > 0) {
    await prisma.notification.createMany({
      data: otherCommenters.map(c => ({
        userId: c.userId,
        type: "comment",
        title: `${user.name} bình luận`,
        body: `"${trimmed.slice(0, 80)}${trimmed.length > 80 ? "..." : ""}" — ${match.homeTeam} vs ${match.awayTeam}`,
        matchId,
      })),
    })
  }

  return NextResponse.json(comment)
}
