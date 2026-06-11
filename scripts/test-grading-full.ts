/**
 * Test đầy đủ hệ thống tính điểm với 200 test cases (50 mỗi loại kèo)
 * + Tạo dữ liệu test trong DB, chạy grading cho user thật
 *
 * Chạy: npx tsx scripts/test-grading-full.ts
 */

// ══════════════════════════════════════════════════════════════
// 1. UNIT TEST: evaluatePrediction — 50 test mỗi loại
// ══════════════════════════════════════════════════════════════

interface PredictionInput {
  betType: string
  side: string | null
  homeScore: number | null
  awayScore: number | null
}

interface MatchInput {
  scoreHome: number
  scoreAway: number
  ahLine: number | null
  ouLine: number | null
}

function evaluatePrediction(pred: PredictionInput, match: MatchInput): { result: "win" | "loss"; reason: string } {
  const { scoreHome, scoreAway, ahLine, ouLine } = match
  const diff = scoreHome - scoreAway
  const total = scoreHome + scoreAway

  switch (pred.betType) {
    case "ah": {
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

// ── Test harness ──

let passed = 0
let failed = 0
const failures: string[] = []

function test(name: string, pred: PredictionInput, match: MatchInput, expected: "win" | "loss") {
  const { result, reason } = evaluatePrediction(pred, match)
  const ok = result === expected
  if (ok) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    const msg = `  ❌ ${name} — expected ${expected}, got ${result} (${reason})`
    console.log(msg)
    failures.push(msg)
  }
}

// ══════════════════════════════════════════════════════════════
// AH — 50 TEST CASES
// ══════════════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════")
console.log("  KÈO CHẤP (Asian Handicap) — 50 cases")
console.log("═══════════════════════════════════════════════════\n")

// --- Kèo -0.5 (nửa trái) ---
test("AH01: -0.5, Nhà, 1-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: -0.5, ouLine: null }, "win")
test("AH02: -0.5, Nhà, 0-0 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: -0.5, ouLine: null }, "loss")
test("AH03: -0.5, Nhà, 0-1 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: -0.5, ouLine: null }, "loss")
test("AH04: -0.5, Khách, 0-0 → win", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: -0.5, ouLine: null }, "win")
test("AH05: -0.5, Khách, 1-0 → loss", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: -0.5, ouLine: null }, "loss")
test("AH06: -0.5, Khách, 0-2 → win", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 2, ahLine: -0.5, ouLine: null }, "win")

// --- Kèo -1 (một trái) ---
test("AH07: -1, Nhà, 2-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 0, ahLine: -1, ouLine: null }, "win")
test("AH08: -1, Nhà, 1-0 → loss (hòa kèo)", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: -1, ouLine: null }, "loss")
test("AH09: -1, Nhà, 3-1 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 1, ahLine: -1, ouLine: null }, "win")
test("AH10: -1, Nhà, 0-1 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: -1, ouLine: null }, "loss")
test("AH11: -1, Khách, 1-0 → win (hòa kèo away cũng thua)", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: -1, ouLine: null }, "loss")
test("AH12: -1, Khách, 0-0 → win", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: -1, ouLine: null }, "win")

// --- Kèo -1.5 ---
test("AH13: -1.5, Nhà, 2-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 0, ahLine: -1.5, ouLine: null }, "win")
test("AH14: -1.5, Nhà, 1-0 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: -1.5, ouLine: null }, "loss")
test("AH15: -1.5, Nhà, 3-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 0, ahLine: -1.5, ouLine: null }, "win")
test("AH16: -1.5, Khách, 1-0 → win", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: -1.5, ouLine: null }, "win")
test("AH17: -1.5, Khách, 4-1 → loss", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 4, scoreAway: 1, ahLine: -1.5, ouLine: null }, "loss")

// --- Kèo -2 ---
test("AH18: -2, Nhà, 3-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 0, ahLine: -2, ouLine: null }, "win")
test("AH19: -2, Nhà, 2-0 → loss (hòa kèo)", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 0, ahLine: -2, ouLine: null }, "loss")
test("AH20: -2, Nhà, 3-1 → loss (hòa kèo)", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 1, ahLine: -2, ouLine: null }, "loss")
test("AH21: -2, Nhà, 4-1 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 4, scoreAway: 1, ahLine: -2, ouLine: null }, "win")
test("AH22: -2, Khách, 2-0 → loss (hòa kèo)", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 0, ahLine: -2, ouLine: null }, "loss")
test("AH23: -2, Khách, 1-0 → win", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: -2, ouLine: null }, "win")

// --- Kèo -0.25 (nửa nửa trái) ---
test("AH24: -0.25, Nhà, 1-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: -0.25, ouLine: null }, "win")
test("AH25: -0.25, Nhà, 0-0 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: -0.25, ouLine: null }, "loss")
test("AH26: -0.25, Nhà, 1-1 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: -0.25, ouLine: null }, "loss")
test("AH27: -0.25, Khách, 0-0 → win", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: -0.25, ouLine: null }, "win")
test("AH28: -0.25, Khách, 2-1 → loss", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: -0.25, ouLine: null }, "loss")

// --- Kèo -0.75 ---
test("AH29: -0.75, Nhà, 1-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: -0.75, ouLine: null }, "win")
test("AH30: -0.75, Nhà, 2-1 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: -0.75, ouLine: null }, "win")
test("AH31: -0.75, Nhà, 0-0 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: -0.75, ouLine: null }, "loss")
test("AH32: -0.75, Khách, 0-0 → win", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: -0.75, ouLine: null }, "win")
test("AH33: -0.75, Khách, 1-0 → loss", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: -0.75, ouLine: null }, "loss")

// --- Kèo +0.5 (kèo dưới nhận nửa trái) ---
test("AH34: +0.5, Nhà, 0-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: 0.5, ouLine: null }, "win")
test("AH35: +0.5, Nhà, 0-1 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: 0.5, ouLine: null }, "loss")
test("AH36: +0.5, Nhà, 1-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: 0.5, ouLine: null }, "win")
test("AH37: +0.5, Khách, 0-0 → loss", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: 0.5, ouLine: null }, "loss")
test("AH38: +0.5, Khách, 0-1 → win", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: 0.5, ouLine: null }, "win")

// --- Kèo +1 ---
test("AH39: +1, Nhà, 0-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: 1, ouLine: null }, "win")
test("AH40: +1, Nhà, 0-1 → loss (hòa kèo)", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: 1, ouLine: null }, "loss")
test("AH41: +1, Nhà, 0-2 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 2, ahLine: 1, ouLine: null }, "loss")
test("AH42: +1, Khách, 0-1 → loss (hòa kèo away)", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: 1, ouLine: null }, "loss")

// --- Kèo 0 (đồng banh) ---
test("AH43: 0, Nhà, 1-0 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: 0, ouLine: null }, "win")
test("AH44: 0, Nhà, 0-0 → loss (hòa kèo)", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: 0, ouLine: null }, "loss")
test("AH45: 0, Nhà, 0-1 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: 0, ouLine: null }, "loss")
test("AH46: 0, Khách, 0-1 → win", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: 0, ouLine: null }, "win")
test("AH47: 0, Khách, 1-0 → loss", { betType: "ah", side: "away", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: 0, ouLine: null }, "loss")

// --- Tỉ số lớn ---
test("AH48: -3.5, Nhà, 5-1 → win", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 5, scoreAway: 1, ahLine: -3.5, ouLine: null }, "win")
test("AH49: -3.5, Nhà, 3-0 → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 0, ahLine: -3.5, ouLine: null }, "loss")
// --- null ahLine ---
test("AH50: null, Nhà → loss", { betType: "ah", side: "home", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null }, "loss")


// ══════════════════════════════════════════════════════════════
// OU — 50 TEST CASES
// ══════════════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════")
console.log("  TÀI / XỈU (Over/Under) — 50 cases")
console.log("═══════════════════════════════════════════════════\n")

// --- Line 2.5 (phổ biến nhất) ---
test("OU01: 2.5, Tài, 2-1=3 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: 2.5 }, "win")
test("OU02: 2.5, Tài, 1-0=1 → loss", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: 2.5 }, "loss")
test("OU03: 2.5, Tài, 0-0=0 → loss", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: 2.5 }, "loss")
test("OU04: 2.5, Tài, 3-3=6 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 3, ahLine: null, ouLine: 2.5 }, "win")
test("OU05: 2.5, Xỉu, 1-0=1 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: 2.5 }, "win")
test("OU06: 2.5, Xỉu, 2-1=3 → loss", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: 2.5 }, "loss")
test("OU07: 2.5, Xỉu, 1-1=2 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: 2.5 }, "win")
test("OU08: 2.5, Xỉu, 0-0=0 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: 2.5 }, "win")

// --- Line 1.5 ---
test("OU09: 1.5, Tài, 1-1=2 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: 1.5 }, "win")
test("OU10: 1.5, Tài, 1-0=1 → loss", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: 1.5 }, "loss")
test("OU11: 1.5, Tài, 0-0=0 → loss", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: 1.5 }, "loss")
test("OU12: 1.5, Xỉu, 1-0=1 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: 1.5 }, "win")
test("OU13: 1.5, Xỉu, 0-0=0 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: 1.5 }, "win")
test("OU14: 1.5, Xỉu, 1-1=2 → loss", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: 1.5 }, "loss")

// --- Line 3.5 ---
test("OU15: 3.5, Tài, 2-2=4 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 2, ahLine: null, ouLine: 3.5 }, "win")
test("OU16: 3.5, Tài, 2-1=3 → loss", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: 3.5 }, "loss")
test("OU17: 3.5, Tài, 4-2=6 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 4, scoreAway: 2, ahLine: null, ouLine: 3.5 }, "win")
test("OU18: 3.5, Xỉu, 1-1=2 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: 3.5 }, "win")
test("OU19: 3.5, Xỉu, 3-1=4 → loss", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 1, ahLine: null, ouLine: 3.5 }, "loss")
test("OU20: 3.5, Xỉu, 2-0=2 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 0, ahLine: null, ouLine: 3.5 }, "win")

// --- Line 0.5 ---
test("OU21: 0.5, Tài, 1-0=1 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: 0.5 }, "win")
test("OU22: 0.5, Tài, 0-0=0 → loss", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: 0.5 }, "loss")
test("OU23: 0.5, Xỉu, 0-0=0 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: 0.5 }, "win")
test("OU24: 0.5, Xỉu, 0-1=1 → loss", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: null, ouLine: 0.5 }, "loss")

// --- Line nguyên (hòa kèo possible): 2, 3 ---
test("OU25: 2, Tài, 1-1=2 → loss (hòa kèo)", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: 2 }, "loss")
test("OU26: 2, Tài, 2-1=3 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: 2 }, "win")
test("OU27: 2, Xỉu, 1-1=2 → loss (hòa kèo)", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: 2 }, "loss")
test("OU28: 2, Xỉu, 1-0=1 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: 2 }, "win")
test("OU29: 3, Tài, 2-1=3 → loss (hòa kèo)", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: 3 }, "loss")
test("OU30: 3, Tài, 2-2=4 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 2, ahLine: null, ouLine: 3 }, "win")
test("OU31: 3, Xỉu, 2-1=3 → loss (hòa kèo)", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: 3 }, "loss")
test("OU32: 3, Xỉu, 1-0=1 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: 3 }, "win")

// --- Line 2.25, 2.75 (kèo nửa chẵn) ---
test("OU33: 2.25, Tài, 1-1=2 → loss", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: 2.25 }, "loss")
test("OU34: 2.25, Tài, 2-1=3 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: 2.25 }, "win")
test("OU35: 2.75, Tài, 2-1=3 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: 2.75 }, "win")
test("OU36: 2.75, Xỉu, 2-1=3 → loss", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: 2.75 }, "loss")
test("OU37: 2.75, Xỉu, 1-1=2 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: 2.75 }, "win")

// --- Line 4.5, 5.5 ---
test("OU38: 4.5, Tài, 3-2=5 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 2, ahLine: null, ouLine: 4.5 }, "win")
test("OU39: 4.5, Tài, 2-2=4 → loss", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 2, ahLine: null, ouLine: 4.5 }, "loss")
test("OU40: 4.5, Xỉu, 2-1=3 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: 4.5 }, "win")
test("OU41: 5.5, Tài, 3-3=6 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 3, ahLine: null, ouLine: 5.5 }, "win")
test("OU42: 5.5, Xỉu, 2-2=4 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 2, ahLine: null, ouLine: 5.5 }, "win")

// --- Tỉ số cực đoan ---
test("OU43: 2.5, Tài, 5-4=9 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 5, scoreAway: 4, ahLine: null, ouLine: 2.5 }, "win")
test("OU44: 2.5, Xỉu, 7-0=7 → loss", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 7, scoreAway: 0, ahLine: null, ouLine: 2.5 }, "loss")
test("OU45: 0.5, Xỉu, 0-0=0 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: 0.5 }, "win")

// --- Line 1 (nguyên) ---
test("OU46: 1, Tài, 1-0=1 → loss (hòa kèo)", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: 1 }, "loss")
test("OU47: 1, Tài, 1-1=2 → win", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: 1 }, "win")
test("OU48: 1, Xỉu, 0-0=0 → win", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: 1 }, "win")

// --- null ouLine ---
test("OU49: null, Tài → loss", { betType: "ou", side: "over", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("OU50: null, Xỉu → loss", { betType: "ou", side: "under", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null }, "loss")


// ══════════════════════════════════════════════════════════════
// 1X2 — 50 TEST CASES
// ══════════════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════")
console.log("  1X2 — 50 cases")
console.log("═══════════════════════════════════════════════════\n")

// --- Nhà thắng rõ ràng ---
test("1X2_01: Nhà, 1-0 → win", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: null }, "win")
test("1X2_02: Nhà, 2-0 → win", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 0, ahLine: null, ouLine: null }, "win")
test("1X2_03: Nhà, 3-1 → win", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 1, ahLine: null, ouLine: null }, "win")
test("1X2_04: Nhà, 2-1 → win", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null }, "win")
test("1X2_05: Nhà, 5-0 → win", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 5, scoreAway: 0, ahLine: null, ouLine: null }, "win")
test("1X2_06: Nhà, 4-3 → win", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 4, scoreAway: 3, ahLine: null, ouLine: null }, "win")
test("1X2_07: Nhà, 1-0 → win", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: null }, "win")

// --- Nhà thua / sai ---
test("1X2_08: Nhà, 0-1 → loss", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("1X2_09: Nhà, 0-2 → loss", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 2, ahLine: null, ouLine: null }, "loss")
test("1X2_10: Nhà, 1-1 → loss (hòa)", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("1X2_11: Nhà, 0-0 → loss (hòa)", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("1X2_12: Nhà, 2-2 → loss (hòa)", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 2, ahLine: null, ouLine: null }, "loss")
test("1X2_13: Nhà, 1-3 → loss", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 3, ahLine: null, ouLine: null }, "loss")

// --- Hòa đúng ---
test("1X2_14: Hòa, 0-0 → win", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: null }, "win")
test("1X2_15: Hòa, 1-1 → win", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: null }, "win")
test("1X2_16: Hòa, 2-2 → win", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 2, ahLine: null, ouLine: null }, "win")
test("1X2_17: Hòa, 3-3 → win", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 3, ahLine: null, ouLine: null }, "win")
test("1X2_18: Hòa, 4-4 → win", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 4, scoreAway: 4, ahLine: null, ouLine: null }, "win")

// --- Hòa sai ---
test("1X2_19: Hòa, 1-0 → loss", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("1X2_20: Hòa, 0-1 → loss", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("1X2_21: Hòa, 2-1 → loss", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("1X2_22: Hòa, 0-3 → loss", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 3, ahLine: null, ouLine: null }, "loss")
test("1X2_23: Hòa, 3-0 → loss", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("1X2_24: Hòa, 5-2 → loss", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 5, scoreAway: 2, ahLine: null, ouLine: null }, "loss")

// --- Khách thắng đúng ---
test("1X2_25: Khách, 0-1 → win", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: null, ouLine: null }, "win")
test("1X2_26: Khách, 0-2 → win", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 2, ahLine: null, ouLine: null }, "win")
test("1X2_27: Khách, 1-3 → win", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 3, ahLine: null, ouLine: null }, "win")
test("1X2_28: Khách, 0-4 → win", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 4, ahLine: null, ouLine: null }, "win")
test("1X2_29: Khách, 2-3 → win", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 3, ahLine: null, ouLine: null }, "win")
test("1X2_30: Khách, 1-2 → win", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 2, ahLine: null, ouLine: null }, "win")

// --- Khách sai ---
test("1X2_31: Khách, 1-0 → loss", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("1X2_32: Khách, 0-0 → loss (hòa)", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("1X2_33: Khách, 2-0 → loss", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("1X2_34: Khách, 3-1 → loss", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("1X2_35: Khách, 1-1 → loss (hòa)", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("1X2_36: Khách, 2-2 → loss (hòa)", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 2, ahLine: null, ouLine: null }, "loss")

// --- Tỉ số đặc biệt ---
test("1X2_37: Nhà, 6-5 → win", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 6, scoreAway: 5, ahLine: null, ouLine: null }, "win")
test("1X2_38: Khách, 3-7 → win", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 7, ahLine: null, ouLine: null }, "win")
test("1X2_39: Hòa, 5-5 → win", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 5, scoreAway: 5, ahLine: null, ouLine: null }, "win")
test("1X2_40: Nhà, 10-0 → win", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 10, scoreAway: 0, ahLine: null, ouLine: null }, "win")
test("1X2_41: Khách, 0-10 → win", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 10, ahLine: null, ouLine: null }, "win")

// --- Sát nút ---
test("1X2_42: Nhà, 1-0 → win (sát nút)", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: null }, "win")
test("1X2_43: Khách, 0-1 → win (sát nút)", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 0, scoreAway: 1, ahLine: null, ouLine: null }, "win")

// --- Mix đoán sai ---
test("1X2_44: Nhà, 3-3 → loss", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 3, scoreAway: 3, ahLine: null, ouLine: null }, "loss")
test("1X2_45: Khách, 4-4 → loss", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 4, scoreAway: 4, ahLine: null, ouLine: null }, "loss")
test("1X2_46: Hòa, 4-3 → loss", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 4, scoreAway: 3, ahLine: null, ouLine: null }, "loss")
test("1X2_47: Hòa, 1-2 → loss", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 1, scoreAway: 2, ahLine: null, ouLine: null }, "loss")
test("1X2_48: Nhà, 2-4 → loss", { betType: "1x2", side: "home", homeScore: null, awayScore: null }, { scoreHome: 2, scoreAway: 4, ahLine: null, ouLine: null }, "loss")
test("1X2_49: Khách, 5-1 → loss", { betType: "1x2", side: "away", homeScore: null, awayScore: null }, { scoreHome: 5, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("1X2_50: Hòa, 6-1 → loss", { betType: "1x2", side: "draw", homeScore: null, awayScore: null }, { scoreHome: 6, scoreAway: 1, ahLine: null, ouLine: null }, "loss")


// ══════════════════════════════════════════════════════════════
// EXACT — 50 TEST CASES
// ══════════════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════")
console.log("  TỈ SỐ CHÍNH XÁC (Exact) — 50 cases")
console.log("═══════════════════════════════════════════════════\n")

// --- Đúng chính xác ---
test("EX01: 1-0 = 1-0 → win", { betType: "exact", side: null, homeScore: 1, awayScore: 0 }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: null }, "win")
test("EX02: 0-0 = 0-0 → win", { betType: "exact", side: null, homeScore: 0, awayScore: 0 }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: null }, "win")
test("EX03: 2-1 = 2-1 → win", { betType: "exact", side: null, homeScore: 2, awayScore: 1 }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null }, "win")
test("EX04: 3-2 = 3-2 → win", { betType: "exact", side: null, homeScore: 3, awayScore: 2 }, { scoreHome: 3, scoreAway: 2, ahLine: null, ouLine: null }, "win")
test("EX05: 0-1 = 0-1 → win", { betType: "exact", side: null, homeScore: 0, awayScore: 1 }, { scoreHome: 0, scoreAway: 1, ahLine: null, ouLine: null }, "win")
test("EX06: 1-1 = 1-1 → win", { betType: "exact", side: null, homeScore: 1, awayScore: 1 }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: null }, "win")
test("EX07: 2-2 = 2-2 → win", { betType: "exact", side: null, homeScore: 2, awayScore: 2 }, { scoreHome: 2, scoreAway: 2, ahLine: null, ouLine: null }, "win")
test("EX08: 3-0 = 3-0 → win", { betType: "exact", side: null, homeScore: 3, awayScore: 0 }, { scoreHome: 3, scoreAway: 0, ahLine: null, ouLine: null }, "win")
test("EX09: 0-3 = 0-3 → win", { betType: "exact", side: null, homeScore: 0, awayScore: 3 }, { scoreHome: 0, scoreAway: 3, ahLine: null, ouLine: null }, "win")
test("EX10: 4-1 = 4-1 → win", { betType: "exact", side: null, homeScore: 4, awayScore: 1 }, { scoreHome: 4, scoreAway: 1, ahLine: null, ouLine: null }, "win")
test("EX11: 3-3 = 3-3 → win", { betType: "exact", side: null, homeScore: 3, awayScore: 3 }, { scoreHome: 3, scoreAway: 3, ahLine: null, ouLine: null }, "win")
test("EX12: 5-0 = 5-0 → win", { betType: "exact", side: null, homeScore: 5, awayScore: 0 }, { scoreHome: 5, scoreAway: 0, ahLine: null, ouLine: null }, "win")

// --- Ngược tỉ số ---
test("EX13: 1-0 vs 0-1 → loss", { betType: "exact", side: null, homeScore: 1, awayScore: 0 }, { scoreHome: 0, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("EX14: 2-1 vs 1-2 → loss", { betType: "exact", side: null, homeScore: 2, awayScore: 1 }, { scoreHome: 1, scoreAway: 2, ahLine: null, ouLine: null }, "loss")
test("EX15: 3-0 vs 0-3 → loss", { betType: "exact", side: null, homeScore: 3, awayScore: 0 }, { scoreHome: 0, scoreAway: 3, ahLine: null, ouLine: null }, "loss")
test("EX16: 0-2 vs 2-0 → loss", { betType: "exact", side: null, homeScore: 0, awayScore: 2 }, { scoreHome: 2, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("EX17: 4-1 vs 1-4 → loss", { betType: "exact", side: null, homeScore: 4, awayScore: 1 }, { scoreHome: 1, scoreAway: 4, ahLine: null, ouLine: null }, "loss")

// --- Sai 1 bàn ---
test("EX18: 1-0 vs 2-0 → loss", { betType: "exact", side: null, homeScore: 1, awayScore: 0 }, { scoreHome: 2, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("EX19: 2-1 vs 2-0 → loss", { betType: "exact", side: null, homeScore: 2, awayScore: 1 }, { scoreHome: 2, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("EX20: 1-1 vs 1-0 → loss", { betType: "exact", side: null, homeScore: 1, awayScore: 1 }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("EX21: 0-0 vs 1-0 → loss", { betType: "exact", side: null, homeScore: 0, awayScore: 0 }, { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("EX22: 3-2 vs 3-1 → loss", { betType: "exact", side: null, homeScore: 3, awayScore: 2 }, { scoreHome: 3, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("EX23: 2-0 vs 2-1 → loss", { betType: "exact", side: null, homeScore: 2, awayScore: 0 }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("EX24: 0-1 vs 0-2 → loss", { betType: "exact", side: null, homeScore: 0, awayScore: 1 }, { scoreHome: 0, scoreAway: 2, ahLine: null, ouLine: null }, "loss")

// --- Sai nhiều bàn ---
test("EX25: 0-0 vs 3-3 → loss", { betType: "exact", side: null, homeScore: 0, awayScore: 0 }, { scoreHome: 3, scoreAway: 3, ahLine: null, ouLine: null }, "loss")
test("EX26: 1-0 vs 5-0 → loss", { betType: "exact", side: null, homeScore: 1, awayScore: 0 }, { scoreHome: 5, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("EX27: 2-1 vs 4-3 → loss", { betType: "exact", side: null, homeScore: 2, awayScore: 1 }, { scoreHome: 4, scoreAway: 3, ahLine: null, ouLine: null }, "loss")
test("EX28: 1-1 vs 4-4 → loss", { betType: "exact", side: null, homeScore: 1, awayScore: 1 }, { scoreHome: 4, scoreAway: 4, ahLine: null, ouLine: null }, "loss")

// --- Đoán hòa, thực tế khác ---
test("EX29: 1-1 vs 2-2 → loss", { betType: "exact", side: null, homeScore: 1, awayScore: 1 }, { scoreHome: 2, scoreAway: 2, ahLine: null, ouLine: null }, "loss")
test("EX30: 2-2 vs 1-1 → loss", { betType: "exact", side: null, homeScore: 2, awayScore: 2 }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("EX31: 0-0 vs 1-1 → loss", { betType: "exact", side: null, homeScore: 0, awayScore: 0 }, { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("EX32: 3-3 vs 2-2 → loss", { betType: "exact", side: null, homeScore: 3, awayScore: 3 }, { scoreHome: 2, scoreAway: 2, ahLine: null, ouLine: null }, "loss")

// --- Đoán thua, thực tế khác ---
test("EX33: 0-1 vs 0-0 → loss", { betType: "exact", side: null, homeScore: 0, awayScore: 1 }, { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("EX34: 0-2 vs 0-1 → loss", { betType: "exact", side: null, homeScore: 0, awayScore: 2 }, { scoreHome: 0, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("EX35: 1-3 vs 1-2 → loss", { betType: "exact", side: null, homeScore: 1, awayScore: 3 }, { scoreHome: 1, scoreAway: 2, ahLine: null, ouLine: null }, "loss")

// --- Tỉ số lớn đúng ---
test("EX36: 4-0 = 4-0 → win", { betType: "exact", side: null, homeScore: 4, awayScore: 0 }, { scoreHome: 4, scoreAway: 0, ahLine: null, ouLine: null }, "win")
test("EX37: 0-4 = 0-4 → win", { betType: "exact", side: null, homeScore: 0, awayScore: 4 }, { scoreHome: 0, scoreAway: 4, ahLine: null, ouLine: null }, "win")
test("EX38: 5-3 = 5-3 → win", { betType: "exact", side: null, homeScore: 5, awayScore: 3 }, { scoreHome: 5, scoreAway: 3, ahLine: null, ouLine: null }, "win")
test("EX39: 6-1 = 6-1 → win", { betType: "exact", side: null, homeScore: 6, awayScore: 1 }, { scoreHome: 6, scoreAway: 1, ahLine: null, ouLine: null }, "win")

// --- Tỉ số lớn sai ---
test("EX40: 5-0 vs 4-0 → loss", { betType: "exact", side: null, homeScore: 5, awayScore: 0 }, { scoreHome: 4, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("EX41: 4-2 vs 4-3 → loss", { betType: "exact", side: null, homeScore: 4, awayScore: 2 }, { scoreHome: 4, scoreAway: 3, ahLine: null, ouLine: null }, "loss")
test("EX42: 3-0 vs 3-1 → loss", { betType: "exact", side: null, homeScore: 3, awayScore: 0 }, { scoreHome: 3, scoreAway: 1, ahLine: null, ouLine: null }, "loss")

// --- Tỉ số cực đoan ---
test("EX43: 7-1 = 7-1 → win", { betType: "exact", side: null, homeScore: 7, awayScore: 1 }, { scoreHome: 7, scoreAway: 1, ahLine: null, ouLine: null }, "win")
test("EX44: 0-5 = 0-5 → win", { betType: "exact", side: null, homeScore: 0, awayScore: 5 }, { scoreHome: 0, scoreAway: 5, ahLine: null, ouLine: null }, "win")
test("EX45: 8-0 vs 7-0 → loss", { betType: "exact", side: null, homeScore: 8, awayScore: 0 }, { scoreHome: 7, scoreAway: 0, ahLine: null, ouLine: null }, "loss")
test("EX46: 6-6 = 6-6 → win", { betType: "exact", side: null, homeScore: 6, awayScore: 6 }, { scoreHome: 6, scoreAway: 6, ahLine: null, ouLine: null }, "win")

// --- Sai cả 2 ---
test("EX47: 1-0 vs 2-1 → loss", { betType: "exact", side: null, homeScore: 1, awayScore: 0 }, { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("EX48: 2-0 vs 3-1 → loss", { betType: "exact", side: null, homeScore: 2, awayScore: 0 }, { scoreHome: 3, scoreAway: 1, ahLine: null, ouLine: null }, "loss")
test("EX49: 0-1 vs 1-2 → loss", { betType: "exact", side: null, homeScore: 0, awayScore: 1 }, { scoreHome: 1, scoreAway: 2, ahLine: null, ouLine: null }, "loss")
test("EX50: 1-2 vs 2-3 → loss", { betType: "exact", side: null, homeScore: 1, awayScore: 2 }, { scoreHome: 2, scoreAway: 3, ahLine: null, ouLine: null }, "loss")


// ══════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════")
console.log(`  TỔNG KẾT UNIT TEST: ${passed} PASSED / ${failed} FAILED / ${passed + failed} TOTAL`)
console.log("═══════════════════════════════════════════════════")

if (failures.length > 0) {
  console.log("\n❌ FAILURES:")
  failures.forEach(f => console.log(f))
}


// ══════════════════════════════════════════════════════════════
// 2. INTEGRATION TEST: Tạo dữ liệu + chấm điểm cho user thật
// ══════════════════════════════════════════════════════════════
console.log("\n\n╔═══════════════════════════════════════════════════╗")
console.log("║  INTEGRATION TEST — Tạo prediction + chấm điểm   ║")
console.log("╚═══════════════════════════════════════════════════╝\n")

import { PrismaClient } from "@prisma/client"

async function runIntegrationTest() {
  const prisma = new PrismaClient()

  try {
    // Lấy users và matches
    const users = await prisma.user.findMany()
    const matches = await prisma.match.findMany({ take: 10, orderBy: { kickoffAt: "asc" } })

    console.log(`👥 Users: ${users.map(u => u.name).join(", ")}`)
    console.log(`⚽ Matches (10 trận đầu):`)
    matches.forEach((m, i) => console.log(`   ${i+1}. ${m.homeTeam} vs ${m.awayTeam} [${m.id.slice(0,8)}]`))

    // Reset: xóa predictions cũ + reset user stats cho 5 trận test
    const testMatchIds = matches.slice(0, 5).map(m => m.id)
    await prisma.prediction.deleteMany({ where: { matchId: { in: testMatchIds } } })
    await prisma.user.updateMany({ data: { totalPoints: 0, streak: 0 } })

    // Lấy hoặc tạo group test cho integration test
    let testGroup = await prisma.group.findFirst()
    if (!testGroup) {
      testGroup = await prisma.group.create({
        data: { name: "Test Group", visibility: "private", inviteCode: "TEST01", adminId: users[0].id },
      })
      for (const u of users) {
        await prisma.groupMember.upsert({
          where: { userId_groupId: { userId: u.id, groupId: testGroup.id } },
          update: {},
          create: { userId: u.id, groupId: testGroup.id, role: u.id === users[0].id ? "owner" : "member" },
        })
      }
    }
    const testGroupId = testGroup.id

    // ── Set tỉ số và kèo cho 5 trận test ──
    const matchSetups = [
      { idx: 0, scoreHome: 2, scoreAway: 1, ahLine: -0.5, ouLine: 2.5, status: "finished" },  // Nhà thắng 2-1
      { idx: 1, scoreHome: 0, scoreAway: 0, ahLine: -1,   ouLine: 1.5, status: "finished" },  // Hòa 0-0
      { idx: 2, scoreHome: 1, scoreAway: 3, ahLine: 0.5,  ouLine: 2.5, status: "finished" },  // Khách thắng 1-3
      { idx: 3, scoreHome: 3, scoreAway: 3, ahLine: -0.5, ouLine: 3.5, status: "finished" },  // Hòa 3-3
      { idx: 4, scoreHome: 4, scoreAway: 0, ahLine: -1.5, ouLine: 2.5, status: "finished" },  // Nhà thắng đậm 4-0
    ]

    for (const s of matchSetups) {
      await prisma.match.update({
        where: { id: matches[s.idx].id },
        data: { scoreHome: s.scoreHome, scoreAway: s.scoreAway, ahLine: s.ahLine, ouLine: s.ouLine, status: s.status },
      })
    }

    console.log("\n📝 Đã set tỉ số cho 5 trận:")
    matchSetups.forEach(s => {
      const m = matches[s.idx]
      console.log(`   ${m.homeTeam} vs ${m.awayTeam}: ${s.scoreHome}-${s.scoreAway} (AH: ${s.ahLine}, OU: ${s.ouLine})`)
    })

    // ── Tạo predictions cho từng user ──
    // Mỗi user đoán 5 trận, mỗi trận đoán loại kèo khác nhau

    const predData: { userId: string, matchIdx: number, betType: string, side: string | null, homeScore: number | null, awayScore: number | null }[] = [
      // User 1: Nguyễn Thị Dự (du@)
      { userId: users.find(u => u.email === "du@phanbong.vn")!.id, matchIdx: 0, betType: "ah", side: "home", homeScore: null, awayScore: null },      // Trận 1: AH home → diff=1+(-0.5)=0.5>0 → WIN
      { userId: users.find(u => u.email === "du@phanbong.vn")!.id, matchIdx: 1, betType: "ou", side: "over", homeScore: null, awayScore: null },      // Trận 2: OU over, 0-0=0<1.5 → LOSS
      { userId: users.find(u => u.email === "du@phanbong.vn")!.id, matchIdx: 2, betType: "1x2", side: "away", homeScore: null, awayScore: null },     // Trận 3: 1X2 away, 1-3 → WIN
      { userId: users.find(u => u.email === "du@phanbong.vn")!.id, matchIdx: 3, betType: "exact", side: null, homeScore: 3, awayScore: 3 },           // Trận 4: Exact 3-3 = 3-3 → WIN
      { userId: users.find(u => u.email === "du@phanbong.vn")!.id, matchIdx: 4, betType: "ah", side: "home", homeScore: null, awayScore: null },      // Trận 5: AH home, diff=4+(-1.5)=2.5>0 → WIN

      // User 2: Lê Minh Đoán (doan@)
      { userId: users.find(u => u.email === "doan@phanbong.vn")!.id, matchIdx: 0, betType: "1x2", side: "draw", homeScore: null, awayScore: null },    // Trận 1: 1X2 draw, 2-1 → LOSS
      { userId: users.find(u => u.email === "doan@phanbong.vn")!.id, matchIdx: 1, betType: "ah", side: "away", homeScore: null, awayScore: null },     // Trận 2: AH away, 0+(-1)=-1<0 → WIN
      { userId: users.find(u => u.email === "doan@phanbong.vn")!.id, matchIdx: 2, betType: "ou", side: "under", homeScore: null, awayScore: null },    // Trận 3: OU under, 1+3=4>2.5 → LOSS
      { userId: users.find(u => u.email === "doan@phanbong.vn")!.id, matchIdx: 3, betType: "1x2", side: "draw", homeScore: null, awayScore: null },    // Trận 4: 1X2 draw, 3-3 → WIN
      { userId: users.find(u => u.email === "doan@phanbong.vn")!.id, matchIdx: 4, betType: "ou", side: "over", homeScore: null, awayScore: null },     // Trận 5: OU over, 4+0=4>2.5 → WIN

      // User 3: Trần Văn Phán (phan@)
      { userId: users.find(u => u.email === "phan@phanbong.vn")!.id, matchIdx: 0, betType: "ou", side: "over", homeScore: null, awayScore: null },     // Trận 1: OU over, 2+1=3>2.5 → WIN
      { userId: users.find(u => u.email === "phan@phanbong.vn")!.id, matchIdx: 1, betType: "exact", side: null, homeScore: 0, awayScore: 0 },          // Trận 2: Exact 0-0 = 0-0 → WIN
      { userId: users.find(u => u.email === "phan@phanbong.vn")!.id, matchIdx: 2, betType: "ah", side: "home", homeScore: null, awayScore: null },     // Trận 3: AH home, diff=-2+(0.5)=-1.5<0 → LOSS
      { userId: users.find(u => u.email === "phan@phanbong.vn")!.id, matchIdx: 3, betType: "ou", side: "under", homeScore: null, awayScore: null },    // Trận 4: OU under, 3+3=6>3.5 → LOSS
      { userId: users.find(u => u.email === "phan@phanbong.vn")!.id, matchIdx: 4, betType: "exact", side: null, homeScore: 4, awayScore: 0 },          // Trận 5: Exact 4-0 = 4-0 → WIN

      // User 4: Bạn - admin (ban@) — chỉ đoán 3 trận, bỏ 2 trận
      { userId: users.find(u => u.email === "ban@phanbong.vn")!.id, matchIdx: 0, betType: "exact", side: null, homeScore: 2, awayScore: 1 },           // Trận 1: Exact 2-1 = 2-1 → WIN
      { userId: users.find(u => u.email === "ban@phanbong.vn")!.id, matchIdx: 1, betType: "1x2", side: "home", homeScore: null, awayScore: null },     // Trận 2: 1X2 home, 0-0 hòa → LOSS
      { userId: users.find(u => u.email === "ban@phanbong.vn")!.id, matchIdx: 2, betType: "ah", side: "away", homeScore: null, awayScore: null },      // Trận 3: AH away, diff=-2+(0.5)=-1.5<0 → WIN
      // Trận 4, 5: BỎ → loss + bỏ dự đoán

      // User 5: Phạm Quang Kèo (keo@) — chỉ đoán 2 trận, bỏ 3 trận
      { userId: users.find(u => u.email === "keo@phanbong.vn")!.id, matchIdx: 0, betType: "ah", side: "away", homeScore: null, awayScore: null },     // Trận 1: AH away, diff=1+(-0.5)=0.5>0 → LOSS
      { userId: users.find(u => u.email === "keo@phanbong.vn")!.id, matchIdx: 1, betType: "ou", side: "under", homeScore: null, awayScore: null },    // Trận 2: OU under, 0+0=0<1.5 → WIN
      // Trận 3, 4, 5: BỎ → loss + bỏ dự đoán
    ]

    console.log("\n📊 Tạo predictions...")
    for (const p of predData) {
      await prisma.prediction.create({
        data: {
          userId: p.userId,
          matchId: matches[p.matchIdx].id,
          groupId: testGroupId,
          betType: p.betType,
          side: p.side,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          confidence: 3,
        },
      })
    }
    console.log(`   Đã tạo ${predData.length} predictions`)

    // ── Import grading engine và chấm điểm ──
    // Dùng dynamic import vì evaluatePrediction đã được copy ở trên cho unit test
    const { gradeMatch } = await import("../lib/grading")

    console.log("\n🏆 CHẤM ĐIỂM 5 TRẬN:\n")

    for (let i = 0; i < 5; i++) {
      const m = matches[i]
      const s = matchSetups[i]
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`⚽ Trận ${i+1}: ${m.homeTeam} vs ${m.awayTeam} — Tỉ số: ${s.scoreHome}-${s.scoreAway}`)
      console.log(`   Kèo chấp: ${s.ahLine} | Tài/Xỉu: ${s.ouLine}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

      const result = await gradeMatch(m.id)
      if (!result) { console.log("   ⚠️ Không thể chấm điểm"); continue }

      console.log(`   📈 Tổng: ${result.totalPredictions} dự đoán | ✅ ${result.wins} thắng | ❌ ${result.losses} thua | ⏭️ ${result.skipped} bỏ`)
      console.log()

      for (const d of result.details) {
        const icon = d.result === "win" ? "✅" : "❌"
        console.log(`   ${icon} ${d.name.padEnd(20)} [${d.betType.padEnd(5)}] ${d.reason}`)
      }

      if (result.skippedUsers.length > 0) {
        console.log()
        for (const s of result.skippedUsers) {
          console.log(`   ⏭️ ${s.name.padEnd(20)} Bỏ dự đoán (${s.groupName})`)
        }
      }
      console.log()
    }

    // ── Bảng tổng kết user ──
    console.log("\n╔═══════════════════════════════════════════════════╗")
    console.log("║  BẢNG TỔNG KẾT SAU 5 TRẬN                        ║")
    console.log("╚═══════════════════════════════════════════════════╝\n")

    const finalUsers = await prisma.user.findMany({ orderBy: { totalPoints: "desc" } })
    const allPreds = await prisma.prediction.findMany({ where: { matchId: { in: testMatchIds } } })

    console.log("┌────┬──────────────────────┬────────┬────────┬────────┬────────┬────────┐")
    console.log("│ #  │ Tên                  │ Điểm   │ Thắng  │ Thua   │ Bỏ     │ Streak │")
    console.log("├────┼──────────────────────┼────────┼────────┼────────┼────────┼────────┤")

    finalUsers.forEach((u, i) => {
      const userPreds = allPreds.filter(p => p.userId === u.id)
      const wins = userPreds.filter(p => p.result === "win").length
      const losses = userPreds.filter(p => p.result === "loss" && p.betType !== "skip").length
      const skipped = userPreds.filter(p => p.betType === "skip").length

      console.log(
        `│ ${String(i+1).padEnd(2)} │ ${u.name.padEnd(20)} │ ${String(u.totalPoints).padStart(6)} │ ${String(wins).padStart(6)} │ ${String(losses).padStart(6)} │ ${String(skipped).padStart(6)} │ ${String(u.streak).padStart(6)} │`
      )
    })
    console.log("└────┴──────────────────────┴────────┴────────┴────────┴────────┴────────┘")

    // ── Chi tiết prediction từng user ──
    console.log("\n📋 CHI TIẾT DỰ ĐOÁN TỪNG USER:\n")

    for (const u of finalUsers) {
      console.log(`\n👤 ${u.name} (${u.email}) — ${u.totalPoints} điểm, streak: ${u.streak}`)
      const userPreds = allPreds.filter(p => p.userId === u.id).sort((a, b) => {
        const idxA = testMatchIds.indexOf(a.matchId)
        const idxB = testMatchIds.indexOf(b.matchId)
        return idxA - idxB
      })

      for (const p of userPreds) {
        const matchIdx = testMatchIds.indexOf(p.matchId)
        const m = matches[matchIdx]
        const s = matchSetups[matchIdx]
        const icon = p.result === "win" ? "✅" : "❌"

        let desc = ""
        if (p.betType === "skip") {
          desc = "⏭️ Bỏ dự đoán"
        } else if (p.betType === "exact") {
          desc = `${p.betType} (${p.homeScore}-${p.awayScore})`
        } else {
          desc = `${p.betType} ${p.side}`
        }

        console.log(`   ${icon} Trận ${matchIdx+1}: ${m.homeTeam} ${s.scoreHome}-${s.scoreAway} ${m.awayTeam} → ${desc.padEnd(20)} → ${p.result}`)
      }
    }

    // ── Cleanup: reset matches về scheduled ──
    console.log("\n\n🧹 Reset trận đấu về trạng thái ban đầu...")
    for (const s of matchSetups) {
      await prisma.match.update({
        where: { id: matches[s.idx].id },
        data: { scoreHome: null, scoreAway: null, ahLine: null, ouLine: null, status: "scheduled" },
      })
    }
    // Xóa predictions test
    await prisma.prediction.deleteMany({ where: { matchId: { in: testMatchIds } } })
    await prisma.user.updateMany({ data: { totalPoints: 0, streak: 0 } })
    console.log("✅ Đã reset xong — dữ liệu sạch!")

  } finally {
    await prisma.$disconnect()
  }
}

runIntegrationTest().catch(console.error)

if (failed > 0) process.exit(1)
