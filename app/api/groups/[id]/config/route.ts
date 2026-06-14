import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { notifyUser } from "@/lib/notify"

type Params = { params: Promise<{ id: string }> }

const LOCK_BEFORE_KICKOFF = 5 * 60 * 1000

async function isGroupAdmin(userId: string, groupId: string) {
  const m = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  return m && (m.role === "owner" || m.role === "admin")
}

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { id: groupId } = await params

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  })
  if (!membership) return NextResponse.json({ error: "Không có quyền" }, { status: 403 })

  const configs = await prisma.groupMatchConfig.findMany({
    where: { groupId },
    include: {
      match: { select: { id: true, homeTeam: true, awayTeam: true, kickoffAt: true, ahLine: true, ouLine: true } },
    },
    orderBy: { match: { kickoffAt: "asc" } },
  })

  return NextResponse.json(configs.map(c => ({
    id: c.id,
    matchId: c.matchId,
    homeTeam: c.match.homeTeam,
    awayTeam: c.match.awayTeam,
    kickoffAt: c.match.kickoffAt,
    globalAhLine: c.match.ahLine,
    globalOuLine: c.match.ouLine,
    ahLine: c.ahLine,
    ouLine: c.ouLine,
    allowedBetTypes: JSON.parse(c.allowedBetTypes),
    pointsMultiplier: c.pointsMultiplier,
    lockMinutes: c.lockMinutes,
    blindMode: c.blindMode,
    updatedAt: c.updatedAt,
  })))
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { id: groupId } = await params

  if (!await isGroupAdmin(user.id, groupId)) {
    return NextResponse.json({ error: "Chỉ admin hội mới được điều chỉnh kèo" }, { status: 403 })
  }

  const { matchId, ahLine, ouLine, allowedBetTypes, pointsMultiplier, lockMinutes, blindMode } = await req.json()
  if (!matchId) return NextResponse.json({ error: "Thiếu matchId" }, { status: 400 })

  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return NextResponse.json({ error: "Trận không tồn tại" }, { status: 404 })

  if (match.kickoffAt.getTime() - Date.now() < LOCK_BEFORE_KICKOFF) {
    return NextResponse.json({ error: "Không thể điều chỉnh kèo trong vòng 5 phút trước khi trận bắt đầu" }, { status: 400 })
  }
  if (match.status !== "scheduled") {
    return NextResponse.json({ error: "Trận đã bắt đầu hoặc kết thúc" }, { status: 400 })
  }

  const validTypes = ["ah", "ou", "exact"]
  const types: string[] = Array.isArray(allowedBetTypes)
    ? allowedBetTypes.filter((t: string) => validTypes.includes(t))
    : validTypes
  if (types.length === 0) return NextResponse.json({ error: "Phải chọn ít nhất 1 loại kèo" }, { status: 400 })

  const multiplier = Math.min(5, Math.max(1, Math.round(pointsMultiplier ?? 1)))
  const lock = Math.min(180, Math.max(0, Math.round(lockMinutes ?? 0)))
  const blind = blindMode === true

  const config = await prisma.groupMatchConfig.upsert({
    where: { groupId_matchId: { groupId, matchId } },
    update: {
      ahLine: ahLine != null ? parseFloat(ahLine) : null,
      ouLine: ouLine != null ? parseFloat(ouLine) : null,
      allowedBetTypes: JSON.stringify(types),
      pointsMultiplier: multiplier,
      lockMinutes: lock,
      blindMode: blind,
      updatedBy: user.id,
    },
    create: {
      groupId, matchId,
      ahLine: ahLine != null ? parseFloat(ahLine) : null,
      ouLine: ouLine != null ? parseFloat(ouLine) : null,
      allowedBetTypes: JSON.stringify(types),
      pointsMultiplier: multiplier,
      lockMinutes: lock,
      blindMode: blind,
      updatedBy: user.id,
    },
  })

  const members = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } })

  const typeLabels: Record<string, string> = { ah: "kèo chấp", ou: "tổng bàn thắng", exact: "tỉ số" }
  const typesLabel = types.map(t => typeLabels[t]).join(", ")
  const lineDetails = [
    ahLine != null ? `chấp ${ahLine}` : null,
    ouLine != null ? `O/U ${ouLine}` : null,
  ].filter(Boolean).join(", ")
  const extras = [
    lineDetails || null,
    multiplier > 1 ? `×${multiplier} điểm` : null,
    lock > 0 ? `khóa sớm ${lock}p` : null,
    blind ? "blind mode" : null,
  ].filter(Boolean).join(" · ")

  await prisma.activity.create({
    data: {
      userId: user.id,
      groupId,
      type: "config",
      action: `đã mở kèo (${typesLabel}${extras ? ` · ${extras}` : ""}) cho trận`,
      target: `${match.homeTeam} vs ${match.awayTeam}`,
    },
  })

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } })
  const pushDetails = [
    typesLabel,
    ahLine != null ? `chấp ${ahLine}` : null,
    ouLine != null ? `tổng bàn thắng ${ouLine}` : null,
    multiplier > 1 ? `×${multiplier} điểm 🔥` : null,
  ].filter(Boolean).join(" · ")

  await Promise.allSettled(
    members
      .filter(m => m.userId !== user.id)
      .map(m => notifyUser({
        userId: m.userId,
        type: "config",
        title: `⚙️ ${group?.name}: Kèo đã cập nhật`,
        body: `${match.homeTeam} vs ${match.awayTeam} — ${pushDetails}`,
        url: `/groups/${groupId}`,
        matchId,
      }))
  )

  return NextResponse.json({ config })
}
