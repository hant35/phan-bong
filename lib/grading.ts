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
      // ahLine = -0.5 means home gives 0.5 goals
      // Result = diff + ahLine > 0 → home wins handicap
      if (ahLine == null) return { result: "loss", reason: "Không có kèo chấp" }
      const handicapResult = diff + ahLine
      if (pred.side === "home") {
        if (handicapResult > 0) return { result: "win", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch thực ${diff} + (${ahLine}) = ${handicapResult} > 0 → Nhà thắng kèo` }
        if (handicapResult < 0) return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch thực ${diff} + (${ahLine}) = ${handicapResult} < 0 → Nhà thua kèo` }
        // handicapResult === 0 → draw → refund → count as loss in this system
        return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, hòa kèo (hoàn tiền) → tính thua` }
      } else {
        // side === "away"
        if (handicapResult < 0) return { result: "win", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch thực ${diff} + (${ahLine}) = ${handicapResult} < 0 → Khách thắng kèo` }
        if (handicapResult > 0) return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch thực ${diff} + (${ahLine}) = ${handicapResult} > 0 → Khách thua kèo` }
        return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, hòa kèo → tính thua` }
      }
    }

    case "ou": {
      // Over/Under
      if (ouLine == null) return { result: "loss", reason: "Không có kèo tài/xỉu" }
      if (pred.side === "over") {
        if (total > ouLine) return { result: "win", reason: `Tài ${ouLine}: tổng bàn ${total} > ${ouLine} → Tài thắng` }
        if (total < ouLine) return { result: "loss", reason: `Tài ${ouLine}: tổng bàn ${total} < ${ouLine} → Tài thua` }
        return { result: "loss", reason: `Tài ${ouLine}: tổng bàn ${total} = ${ouLine} → hòa kèo → tính thua` }
      } else {
        // side === "under"
        if (total < ouLine) return { result: "win", reason: `Xỉu ${ouLine}: tổng bàn ${total} < ${ouLine} → Xỉu thắng` }
        if (total > ouLine) return { result: "loss", reason: `Xỉu ${ouLine}: tổng bàn ${total} > ${ouLine} → Xỉu thua` }
        return { result: "loss", reason: `Xỉu ${ouLine}: tổng bàn ${total} = ${ouLine} → hòa kèo → tính thua` }
      }
    }

    case "1x2": {
      // 1X2: predict home/draw/away
      if (pred.side === "home" && diff > 0) return { result: "win", reason: `1X2: ${scoreHome}-${scoreAway} → Nhà thắng ✓` }
      if (pred.side === "draw" && diff === 0) return { result: "win", reason: `1X2: ${scoreHome}-${scoreAway} → Hòa ✓` }
      if (pred.side === "away" && diff < 0) return { result: "win", reason: `1X2: ${scoreHome}-${scoreAway} → Khách thắng ✓` }
      const actual = diff > 0 ? "Nhà thắng" : diff < 0 ? "Khách thắng" : "Hòa"
      const picked = pred.side === "home" ? "Nhà thắng" : pred.side === "away" ? "Khách thắng" : "Hòa"
      return { result: "loss", reason: `1X2: ${scoreHome}-${scoreAway} → ${actual}, bạn chọn ${picked} ✗` }
    }

    case "exact": {
      // Exact score
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

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: { user: { select: { id: true, name: true } } },
  })

  const details: GradingResult["details"] = []
  let wins = 0, losses = 0

  for (const pred of predictions) {
    const { result, reason } = evaluatePrediction(
      { betType: pred.betType, side: pred.side, homeScore: pred.homeScore, awayScore: pred.awayScore },
      { scoreHome: match.scoreHome, scoreAway: match.scoreAway, ahLine: match.ahLine, ouLine: match.ouLine },
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

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: { user: { select: { id: true, name: true } } },
  })

  const details: GradingResult["details"] = []
  let wins = 0, losses = 0

  // 1. Grade each prediction
  for (const pred of predictions) {
    const { result, reason } = evaluatePrediction(
      { betType: pred.betType, side: pred.side, homeScore: pred.homeScore, awayScore: pred.awayScore },
      { scoreHome: match.scoreHome, scoreAway: match.scoreAway, ahLine: match.ahLine, ouLine: match.ouLine },
    )

    // Update prediction result
    await prisma.prediction.update({
      where: { id: pred.id },
      data: { result, points: result === "win" ? 1 : 0 },
    })

    // Update user stats
    if (result === "win") {
      await prisma.user.update({
        where: { id: pred.userId },
        data: { totalPoints: { increment: 1 }, streak: { increment: 1 } },
      })
      // Update GroupMember wins
      await prisma.groupMember.updateMany({
        where: { userId: pred.userId },
        data: { wins: { increment: 1 }, points: { increment: 1 } },
      })
      wins++
    } else {
      await prisma.user.update({
        where: { id: pred.userId },
        data: { streak: 0 },
      })
      // Update GroupMember losses
      await prisma.groupMember.updateMany({
        where: { userId: pred.userId },
        data: { losses: { increment: 1 } },
      })
      losses++
    }

    details.push({ userId: pred.userId, name: pred.user.name, betType: pred.betType, result, reason })
  }

  // 2. Find group members who did NOT predict (skipped)
  const skippedUsers: GradingResult["skippedUsers"] = []
  const predictedUserIds = new Set(predictions.map(p => p.userId))

  // Get all groups and their members
  const groups = await prisma.group.findMany({
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  })

  for (const group of groups) {
    for (const member of group.members) {
      if (!predictedUserIds.has(member.userId)) {
        skippedUsers.push({
          userId: member.userId,
          name: member.user.name,
          groupName: group.name,
        })
      }
    }
  }

  // Deduplicate skipped users (may be in multiple groups)
  const seenSkipped = new Set<string>()
  const uniqueSkipped = skippedUsers.filter(s => {
    if (seenSkipped.has(s.userId)) return false
    seenSkipped.add(s.userId)
    return true
  })

  // Create "loss" predictions for skipped users (one per user, not per group)
  for (const skipped of uniqueSkipped) {
    // Check if prediction already exists (might have been created by another group check)
    const existing = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId: skipped.userId, matchId } },
    })
    if (!existing) {
      await prisma.prediction.create({
        data: {
          userId: skipped.userId,
          matchId,
          betType: "skip",
          side: null,
          confidence: 0,
          result: "loss",
          points: 0,
        },
      })
      // streak reset for skipped users too
      await prisma.user.update({
        where: { id: skipped.userId },
        data: { streak: 0 },
      })
      // Update GroupMember skipped
      await prisma.groupMember.updateMany({
        where: { userId: skipped.userId },
        data: { skipped: { increment: 1 } },
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
    skipped: uniqueSkipped.length,
    details,
    skippedUsers: uniqueSkipped,
  }
}
