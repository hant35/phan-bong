import { prisma } from "@/lib/db"
import { notifyUser } from "@/lib/notify"

// ══════════════════════════════════════════════════════════════
// Badge auto-award — tiêu chí khớp prisma/seed.ts BADGES
// ══════════════════════════════════════════════════════════════

export type BadgeCode =
  | "mat_than"
  | "nguoc_dong"
  | "cu_lua"
  | "luon_leo"
  | "dem_khuya"
  | "tau_lua"
  | "sieu_nhan"
  | "thua_hoai"
  | "vua_exact"
  | "dao_keo"

async function hasBadge(userId: string, badgeCode: BadgeCode): Promise<boolean> {
  const row = await prisma.userBadge.findUnique({
    where: { userId_badgeCode: { userId, badgeCode } },
  })
  return !!row
}

async function grantBadge(userId: string, badgeCode: BadgeCode, groupId?: string | null): Promise<boolean> {
  if (await hasBadge(userId, badgeCode)) return false

  const badge = await prisma.badge.findUnique({ where: { code: badgeCode } })
  if (!badge) return false

  await prisma.userBadge.create({ data: { userId, badgeCode } })

  await prisma.activity.create({
    data: {
      userId,
      groupId: groupId ?? undefined,
      type: "badge",
      action: "nhận badge mới",
      target: `${badge.emoji} ${badge.name}`,
      meta: JSON.stringify({ badge: badgeCode }),
    },
  })

  await notifyUser({
    userId,
    type: "badge",
    title: `🏅 Badge mới: ${badge.name}`,
    body: badge.description,
    url: "/profile",
  }).catch(() => {})

  return true
}

function vietnamHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(date),
  )
}

async function countExactWins(userId: string): Promise<number> {
  return prisma.prediction.count({
    where: { userId, betType: "exact", result: "win" },
  })
}

async function countConsecutiveResults(
  userId: string,
  result: "win" | "loss",
  filter?: { betType?: string; minConfidence?: number },
): Promise<number> {
  const preds = await prisma.prediction.findMany({
    where: {
      userId,
      result: { in: ["win", "loss"] },
      betType: { not: "skip" },
      ...(filter?.betType ? { betType: filter.betType } : {}),
      ...(filter?.minConfidence ? { confidence: { gte: filter.minConfidence } } : {}),
    },
    include: { match: { select: { kickoffAt: true } } },
    orderBy: { match: { kickoffAt: "desc" } },
    take: 20,
  })

  let count = 0
  for (const p of preds) {
    if (p.result !== result) break
    count++
  }
  return count
}

async function countContrarianWins(userId: string): Promise<number> {
  const wins = await prisma.prediction.findMany({
    where: { userId, result: "win", betType: { in: ["ah", "ou"] }, side: { not: null } },
    select: { matchId: true, groupId: true, side: true, betType: true },
  })

  let count = 0
  for (const w of wins) {
    const siblings = await prisma.prediction.findMany({
      where: {
        matchId: w.matchId,
        groupId: w.groupId,
        betType: w.betType,
        side: { not: null },
      },
      select: { side: true },
    })
    if (siblings.length < 2) continue

    const sameSide = siblings.filter(p => p.side === w.side).length
    const majorityThreshold = Math.ceil(siblings.length / 2)
    if (sameSide < majorityThreshold) count++
  }
  return count
}

async function countUnderdogWins(userId: string): Promise<number> {
  const wins = await prisma.prediction.findMany({
    where: { userId, result: "win", betType: { in: ["ah", "ou"] }, side: { not: null } },
    select: { matchId: true, groupId: true, side: true, betType: true },
  })

  let count = 0
  for (const w of wins) {
    const siblings = await prisma.prediction.findMany({
      where: {
        matchId: w.matchId,
        groupId: w.groupId,
        betType: w.betType,
        side: { not: null },
      },
      select: { side: true },
    })
    if (siblings.length < 5) continue

    const sameSide = siblings.filter(p => p.side === w.side).length
    if (sameSide / siblings.length < 0.1) count++
  }
  return count
}

async function countAllInLosses(userId: string): Promise<number> {
  return prisma.prediction.count({
    where: { userId, confidence: 5, result: "loss", betType: { not: "skip" } },
  })
}

/** Kiểm tra badge sau khi user đặt / sửa pick */
export async function checkBadgesOnPick(
  userId: string,
  groupId: string,
  opts: { createdAt: Date; editCount: number },
): Promise<void> {
  const hour = vietnamHour(opts.createdAt)
  if (hour >= 1 && hour <= 5) {
    await grantBadge(userId, "dem_khuya", groupId)
  }

  if (opts.editCount >= 3) {
    await grantBadge(userId, "luon_leo", groupId)
  }
}

/** Kiểm tra badge sau khi chấm điểm trận */
export async function checkBadgesAfterGrading(userIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(userIds)]
  if (uniqueIds.length === 0) return

  for (const userId of uniqueIds) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true },
    })
    if (!user) continue

    const exactWins = await countExactWins(userId)
    if (exactWins >= 3) await grantBadge(userId, "mat_than")
    if (exactWins >= 5) await grantBadge(userId, "vua_exact")

    if (user.streak >= 5) await grantBadge(userId, "sieu_nhan")

    const lossStreak = await countConsecutiveResults(userId, "loss")
    if (lossStreak >= 5) await grantBadge(userId, "thua_hoai")

    const ahWinStreak = await countConsecutiveResults(userId, "win", { betType: "ah" })
    if (ahWinStreak >= 10) await grantBadge(userId, "dao_keo")

    const allInLosses = await countAllInLosses(userId)
    if (allInLosses >= 3) await grantBadge(userId, "tau_lua")

    const contrarianWins = await countContrarianWins(userId)
    if (contrarianWins >= 3) await grantBadge(userId, "nguoc_dong")

    const underdogWins = await countUnderdogWins(userId)
    if (underdogWins >= 1) await grantBadge(userId, "cu_lua")
  }
}
