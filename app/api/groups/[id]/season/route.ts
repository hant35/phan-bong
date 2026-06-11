import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { GROUP_STARTING_POINTS } from "@/lib/group-points"

type Params = { params: Promise<{ id: string }> }

// GET — lịch sử mùa giải
export async function GET(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { id: groupId } = await params

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  })
  if (!membership) return NextResponse.json({ error: "Không có quyền" }, { status: 403 })

  const seasons = await prisma.groupSeason.findMany({
    where: { groupId },
    orderBy: { startedAt: "desc" },
  })

  return NextResponse.json(seasons.map(s => ({
    id: s.id,
    name: s.name,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    standings: JSON.parse(s.snapshot),
  })))
}

// POST — bắt đầu mùa giải mới (snapshot standings hiện tại rồi reset)
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { id: groupId } = await params

  const myMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  })
  if (!myMembership || myMembership.role !== "owner") {
    return NextResponse.json({ error: "Chỉ chủ hội mới được reset mùa giải" }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Thiếu tên mùa giải" }, { status: 400 })

  // Snapshot standings hiện tại
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    orderBy: { points: "desc" },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })

  const snapshot = members.map((m, i) => ({
    rank: i + 1,
    userId: m.userId,
    name: m.user.name,
    avatar: m.user.avatar ?? "??",
    points: m.points,
    wins: m.wins,
    losses: m.losses,
    skipped: m.skipped,
  }))

  // Đóng mùa trước (nếu có)
  await prisma.groupSeason.updateMany({
    where: { groupId, endedAt: null },
    data: { endedAt: new Date() },
  })

  // Lưu snapshot
  await prisma.groupSeason.create({
    data: {
      groupId,
      name: name.trim(),
      snapshot: JSON.stringify(snapshot),
      endedAt: new Date(),
    },
  })

  // Reset tất cả GroupMember stats
  await prisma.groupMember.updateMany({
    where: { groupId },
    data: { points: GROUP_STARTING_POINTS, wins: 0, losses: 0, skipped: 0 },
  })

  // Ghi activity
  await prisma.activity.create({
    data: {
      userId: user.id,
      groupId,
      type: "season",
      action: "đã bắt đầu mùa giải mới:",
      target: name.trim(),
    },
  })

  return NextResponse.json({ ok: true, seasonName: name.trim(), memberCount: members.length })
}
