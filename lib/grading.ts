import { prisma } from "@/lib/db"

// ══════════════════════════════════════════════════════════════
// Grading Engine — chấm điểm khi trận kết thúc
// ══════════════════════════════════════════════════════════════

export interface GradingResult {
  matchId: string
  homeTeam: string
  awayTeam: string
  scoreHome: number
  scoreAway: number
  totalPredictions: number
  wins: number
  losses: number
  skipped: number // thành viên hội không đoán
  details: { userId: string; name: string; betType: string; result: "win" | "loss"; reason: string }[]
  skippedUsers: { userId: string; name: string; groupName: string }[]
}

// ── Determine win/loss for a single prediction ──

interface PredictionInput {
  betType: string    // "ah" | "ou" | "1x2" | "exact"
  side: string | null     // "home" | "away" | "draw" | "over" | "under"
  homeScore: number | null
  awayScore: number | null
}

interface MatchInput {
  scoreHome: number
  scoreAway: number
  ahLine: number | null
  ouLine: number | null
}

export function evaluatePrediction(pred: PredictionInput, match: MatchInput): { result: "win" | "loss"; reason: string } {
  const { scoreHome, scoreAway, ahLine, ouLine } = match
  const diff = scoreHome - scoreAway // positive = home wins
  const total = scoreHome + scoreAway

  switch (pred.betType) {
    case "ah": {
      // Asian Handicap: ahLine applies to HOME team
      if (ahLine == null) return { result: "loss", reason: "Không có kèo chấp" }
      const handicapResult = diff + ahLine
      if (pred.side === "home") {
        if (handicapResult > 0) return { result: "win", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch thực ${diff} + (${ahLine}) = ${handicapResult} > 0 → Nhà thắng kèo` }
        if (handicapResult < 0) return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch thực ${diff} + (${ahLine}) = ${handicapResult} < 0 → Nhà thua kèo` }
        return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, hòa kèo (hoàn tiền) → tính thua` }
      } else {
        if (handicapResult < 0) return { result: "win", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch thực ${diff} + (${ahLine}) = ${handicapResult} < 0 → Khách thắng kèo` }
        if (handicapResult > 0) return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch thực ${diff} + (${ahLine}) = ${handicapResult} > 0 → Khách thua kèo` }
        return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, hòa kèo → tính thua` }
      }
    }

    case "ou": {
      if (ouLine == null) return { result: "loss", reason: "Không có kèo tài/xỉu" }
      if (pred.side === "over") {
        if (total > ouLine) return { result: "win", reason: `Tài ${ouLine}: tổng bàn ${total} > ${ouLine} → Tài thắng` }
        if (total < ouLine) return { result: "loss", reason: `Tài ${ouLine}: tổng bàn ${total} < ${ouLine} → Tài thua` }
        return { result: "loss", reason: `Tài ${ouLine}: tổng bàn ${total} = ${ouLine} → hòa kèo → tính thua` }
      } else {
        if (total < ouLine) return { result: "win", reason: `Xỉu ${ouLine}: tổng bàn ${total} < ${ouLine} → Xỉu thắng` }
        if (total > ouLine) return { result: "loss", reason: `Xỉu ${ouLine}: tổng bàn ${total} > ${ouLine} → Xỉu thua` }
        return { result: "loss", reason: `Xỉu ${ouLine}: tổng bàn ${total} = ${ouLine} → hòa kèo → tính thua` }
      }
    }

    case "1x2": {
      if (pred.side === "home" && diff > 0) return { result: "win", reason: `1X2: ${scoreHome}-${scoreAway} → Nhà thắng ✓` }
      if (pred.side === "draw" && diff === 0) return { result: "win", reason: `1X2: ${scoreHome}-${scoreAway} → Hòa ✓` }
      if (pred.side === "away" && diff < 0) return { result: "win", reason: `1X2: ${scoreHome}-${scoreAway} → Khách thắng ✓` }
      const actual = diff > 0 ? "Nhà thắng" : diff < 0 ? "Khách thắng" : "Hòa"
      const picked = pred.side === "home" ? "Nhà thắng" : pred.side === "away" ? "Khách thắng" : "Hòa"
      return { result: "loss", reason: `1X2: ${scoreHome}-${scoreAway} → ${actual}, bạn chọn ${picked} ✗` }
    }

    case "exact": {
      if (pred.homeScore === scoreHome && pred.awayScore === scoreAway) {
        return { result: "win", reason: `Tỉ số: đoán ${pred.homeScore}-${pred.awayScore}, thực tế ${scoreHome}-${scoreAway} ✓ CHÍNH XÁC!` }
      }
      return { result: "loss", reason: `Tỉ số: đoán ${pred.homeScore}-${pred.awayScore}, thực tế ${scoreHome}-${scoreAway} ✗` }
    }

    default:
      return { result: "loss", reason: `Loại kèo không xác định: ${pred.betType}` }
  }
}

// ── Preview grading (for live matches — temporary) ──

export async function previewGrading(matchId: string): Promise<GradingResult | null> {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match || match.scoreHome == null || match.scoreAway == null) return null

  // Lấy group configs để dùng kèo riêng của từng hội
  const groupConfigs = await prisma.groupMatchConfig.findMany({
    where: { matchId },
    select: { groupId: true, ahLine: true, ouLine: true, pointsMultiplier: true },
  })
  const configMap: Record<string, { ahLine: number | null; ouLine: number | null; pointsMultiplier: number }> = {}
  for (const c of groupConfigs) configMap[c.groupId] = { ahLine: c.ahLine, ouLine: c.ouLine, pointsMultiplier: c.pointsMultiplier }

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: { user: { select: { id: true, name: true } } },
  })

  const details: GradingResult["details"] = []
  let wins = 0, losses = 0

  for (const pred of predictions) {
    const cfg = configMap[pred.groupId] ?? {}
    const { result, reason } = evaluatePrediction(
      { betType: pred.betType, side: pred.side, homeScore: pred.homeScore, awayScore: pred.awayScore },
      {
        scoreHome: match.scoreHome,
        scoreAway: match.scoreAway,
        ahLine: cfg.ahLine ?? match.ahLine,
        ouLine: cfg.ouLine ?? match.ouLine,
      },
    )
    details.push({ userId: pred.userId, name: pred.user.name, betType: pred.betType, result, reason })
    if (result === "win") wins++
    else losses++
  }

  return {
    matchId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    scoreHome: match.scoreHome,
    scoreAway: match.scoreAway,
    totalPredictions: predictions.length,
    wins,
    losses,
    skipped: 0,
    details,
    skippedUsers: [],
  }
}

// ── Final grading (when match is finished) ──

export async function gradeMatch(matchId: string): Promise<GradingResult | null> {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match || match.scoreHome == null || match.scoreAway == null) return null

  // Lấy group configs để dùng kèo riêng của từng hội
  const groupConfigs = await prisma.groupMatchConfig.findMany({
    where: { matchId },
    select: { groupId: true, ahLine: true, ouLine: true, pointsMultiplier: true },
  })
  const configMap: Record<string, { ahLine: number | null; ouLine: number | null; pointsMultiplier: number }> = {}
  for (const c of groupConfigs) configMap[c.groupId] = { ahLine: c.ahLine, ouLine: c.ouLine, pointsMultiplier: c.pointsMultiplier }

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: { user: { select: { id: true, name: true } } },
  })

  const details: GradingResult["details"] = []
  let wins = 0, losses = 0

  // 1. Grade each prediction using group-specific kèo
  for (const pred of predictions) {
    const cfg = configMap[pred.groupId] ?? {}
    const { result, reason } = evaluatePrediction(
      { betType: pred.betType, side: pred.side, homeScore: pred.homeScore, awayScore: pred.awayScore },
      {
        scoreHome: match.scoreHome,
        scoreAway: match.scoreAway,
        ahLine: cfg.ahLine ?? match.ahLine,
        ouLine: cfg.ouLine ?? match.ouLine,
      },
    )

    const multiplier = cfg.pointsMultiplier ?? 1
    const earnedPoints = result === "win" ? multiplier : 0

    await prisma.prediction.update({
      where: { id: pred.id },
      data: { result, points: earnedPoints },
    })

    if (result === "win") {
      await prisma.user.update({
        where: { id: pred.userId },
        data: { totalPoints: { increment: earnedPoints }, streak: { increment: 1 } },
      })
      await prisma.groupMember.updateMany({
        where: { userId: pred.userId, groupId: pred.groupId },
        data: { wins: { increment: 1 }, points: { increment: earnedPoints } },
      })
      wins++
    } else {
      await prisma.user.update({
        where: { id: pred.userId },
        data: { streak: 0 },
      })
      await prisma.groupMember.updateMany({
        where: { userId: pred.userId, groupId: pred.groupId },
        data: { losses: { increment: 1 } },
      })
      losses++
    }

    details.push({ userId: pred.userId, name: pred.user.name, betType: pred.betType, result, reason })
  }

  // 2. Tìm thành viên chưa đoán theo từng hội (per-group skip)
  const skippedUsers: GradingResult["skippedUsers"] = []

  const groups = await prisma.group.findMany({
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  })

  const predictedByGroup: Record<string, Set<string>> = {}
  for (const pred of predictions) {
    if (!predictedByGroup[pred.groupId]) predictedByGroup[pred.groupId] = new Set()
    predictedByGroup[pred.groupId].add(pred.userId)
  }

  for (const group of groups) {
    const predicted = predictedByGroup[group.id] ?? new Set<string>()
    for (const member of group.members) {
      if (!predicted.has(member.userId)) {
        skippedUsers.push({ userId: member.userId, name: member.user.name, groupName: group.name })

        // Tạo "skip" prediction cho hội này
        const existing = await prisma.prediction.findUnique({
          where: { userId_matchId_groupId: { userId: member.userId, matchId, groupId: group.id } },
        })
        if (!existing) {
          await prisma.prediction.create({
            data: {
              userId: member.userId,
              matchId,
              groupId: group.id,
              betType: "skip",
              side: null,
              confidence: 0,
              result: "loss",
              points: 0,
            },
          })
          await prisma.groupMember.updateMany({
            where: { userId: member.userId, groupId: group.id },
            data: { skipped: { increment: 1 } },
          })
        }
      }
    }
  }

  // Reset streak cho những user không đoán (chỉ 1 lần dù nhiều hội)
  const seenSkipped = new Set<string>()
  for (const s of skippedUsers) {
    if (!seenSkipped.has(s.userId)) {
      seenSkipped.add(s.userId)
      await prisma.user.update({
        where: { id: s.userId },
        data: { streak: 0 },
      })
    }
  }

  return {
    matchId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    scoreHome: match.scoreHome,
    scoreAway: match.scoreAway,
    totalPredictions: predictions.length,
    wins,
    losses,
    skipped: skippedUsers.length,
    details,
    skippedUsers,
  }
}
