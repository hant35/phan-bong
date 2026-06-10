/**
 * Test toàn bộ logic tính điểm
 * Chạy: npx tsx scripts/test-grading.ts
 */

// Import trực tiếp hàm evaluatePrediction
// (copy logic ra để test độc lập, không cần DB)

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
        if (handicapResult > 0) return { result: "win", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch ${diff} + (${ahLine}) = ${handicapResult} > 0 → Nhà thắng kèo` }
        if (handicapResult < 0) return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch ${diff} + (${ahLine}) = ${handicapResult} < 0 → Nhà thua kèo` }
        return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, hòa kèo → tính thua` }
      } else {
        if (handicapResult < 0) return { result: "win", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch ${diff} + (${ahLine}) = ${handicapResult} < 0 → Khách thắng kèo` }
        if (handicapResult > 0) return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, chênh lệch ${diff} + (${ahLine}) = ${handicapResult} > 0 → Khách thua kèo` }
        return { result: "loss", reason: `Chấp ${ahLine}: ${scoreHome}-${scoreAway}, hòa kèo → tính thua` }
      }
    }
    case "ou": {
      if (ouLine == null) return { result: "loss", reason: "Không có kèo tài/xỉu" }
      if (pred.side === "over") {
        if (total > ouLine) return { result: "win", reason: `Tài ${ouLine}: tổng ${total} > ${ouLine} → Tài thắng` }
        if (total < ouLine) return { result: "loss", reason: `Tài ${ouLine}: tổng ${total} < ${ouLine} → Tài thua` }
        return { result: "loss", reason: `Tài ${ouLine}: tổng ${total} = ${ouLine} → hòa kèo → tính thua` }
      } else {
        if (total < ouLine) return { result: "win", reason: `Xỉu ${ouLine}: tổng ${total} < ${ouLine} → Xỉu thắng` }
        if (total > ouLine) return { result: "loss", reason: `Xỉu ${ouLine}: tổng ${total} > ${ouLine} → Xỉu thua` }
        return { result: "loss", reason: `Xỉu ${ouLine}: tổng ${total} = ${ouLine} → hòa kèo → tính thua` }
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

// ══════════════════════════════════════════════════════════════
// TEST CASES
// ══════════════════════════════════════════════════════════════

let passed = 0
let failed = 0

function test(name: string, pred: PredictionInput, match: MatchInput, expected: "win" | "loss") {
  const { result, reason } = evaluatePrediction(pred, match)
  const ok = result === expected
  const icon = ok ? "✅" : "❌"
  console.log(`${icon} ${name}`)
  console.log(`   Tỉ số: ${match.scoreHome}-${match.scoreAway} | AH: ${match.ahLine} | OU: ${match.ouLine}`)
  console.log(`   Đoán: ${pred.betType} ${pred.side ?? ""} ${pred.homeScore != null ? `(${pred.homeScore}-${pred.awayScore})` : ""}`)
  console.log(`   Kết quả: ${result} — ${reason}`)
  if (!ok) {
    console.log(`   ⚠️  EXPECTED: ${expected}, GOT: ${result}`)
    failed++
  } else {
    passed++
  }
  console.log()
}

console.log("═══════════════════════════════════════════")
console.log("  TEST TÍNH ĐIỂM - PHÁN BÓNG")
console.log("═══════════════════════════════════════════\n")

// ─── KÈO CHẤP (AH) ───────────────────────────

console.log("── KÈO CHẤP (Asian Handicap) ──\n")

// Argentina -0.5 vs Saudi Arabia, tỉ số 2-1
test(
  "AH: Argentina -0.5, chọn Nhà, tỉ số 2-1 → THẮNG",
  { betType: "ah", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 2, scoreAway: 1, ahLine: -0.5, ouLine: 2.5 },
  "win"
)

test(
  "AH: Argentina -0.5, chọn Khách, tỉ số 2-1 → THUA",
  { betType: "ah", side: "away", homeScore: null, awayScore: null },
  { scoreHome: 2, scoreAway: 1, ahLine: -0.5, ouLine: 2.5 },
  "loss"
)

// Brazil -1.5, tỉ số 1-0 (chênh lệch = 1, 1 + (-1.5) = -0.5 < 0)
test(
  "AH: Brazil -1.5, chọn Nhà, tỉ số 1-0 → THUA (thắng không đủ)",
  { betType: "ah", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 1, scoreAway: 0, ahLine: -1.5, ouLine: 2.5 },
  "loss"
)

test(
  "AH: Brazil -1.5, chọn Khách, tỉ số 1-0 → THẮNG",
  { betType: "ah", side: "away", homeScore: null, awayScore: null },
  { scoreHome: 1, scoreAway: 0, ahLine: -1.5, ouLine: 2.5 },
  "win"
)

// Germany -2, tỉ số 3-1 (chênh lệch = 2, 2 + (-2) = 0 → hòa kèo)
test(
  "AH: Germany -2, chọn Nhà, tỉ số 3-1 → THUA (hòa kèo = thua)",
  { betType: "ah", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 3, scoreAway: 1, ahLine: -2, ouLine: 2.5 },
  "loss"
)

// Spain +0.5 (underdog), tỉ số 0-0
test(
  "AH: Home +0.5 (kèo dưới), chọn Nhà, tỉ số 0-0 → THẮNG",
  { betType: "ah", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 0, scoreAway: 0, ahLine: 0.5, ouLine: 2.5 },
  "win"
)

// Home -0.25 (kèo nửa trái), tỉ số 1-1 (diff=0, 0+(-0.25)=-0.25 < 0)
test(
  "AH: Home -0.25, chọn Nhà, tỉ số 1-1 → THUA",
  { betType: "ah", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 1, scoreAway: 1, ahLine: -0.25, ouLine: 2.5 },
  "loss"
)

// Home -0.75, tỉ số 2-1 (diff=1, 1+(-0.75)=0.25 > 0)
test(
  "AH: Home -0.75, chọn Nhà, tỉ số 2-1 → THẮNG",
  { betType: "ah", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 2, scoreAway: 1, ahLine: -0.75, ouLine: 2.5 },
  "win"
)

// Home 0 (kèo đồng banh), tỉ số 0-0 → hòa kèo = thua
test(
  "AH: Home 0, chọn Nhà, tỉ số 0-0 → THUA (hòa kèo)",
  { betType: "ah", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 0, scoreAway: 0, ahLine: 0, ouLine: 2.5 },
  "loss"
)

// Không có ahLine
test(
  "AH: Không set kèo, chọn Nhà → THUA",
  { betType: "ah", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: 2.5 },
  "loss"
)

// ─── TÀI / XỈU (OU) ──────────────────────────

console.log("── TÀI / XỈU (Over/Under) ──\n")

test(
  "OU: Line 2.5, chọn Tài, tỉ số 2-1 (tổng 3) → THẮNG",
  { betType: "ou", side: "over", homeScore: null, awayScore: null },
  { scoreHome: 2, scoreAway: 1, ahLine: -0.5, ouLine: 2.5 },
  "win"
)

test(
  "OU: Line 2.5, chọn Xỉu, tỉ số 2-1 (tổng 3) → THUA",
  { betType: "ou", side: "under", homeScore: null, awayScore: null },
  { scoreHome: 2, scoreAway: 1, ahLine: -0.5, ouLine: 2.5 },
  "loss"
)

test(
  "OU: Line 2.5, chọn Tài, tỉ số 1-0 (tổng 1) → THUA",
  { betType: "ou", side: "over", homeScore: null, awayScore: null },
  { scoreHome: 1, scoreAway: 0, ahLine: -0.5, ouLine: 2.5 },
  "loss"
)

test(
  "OU: Line 2.5, chọn Xỉu, tỉ số 1-0 (tổng 1) → THẮNG",
  { betType: "ou", side: "under", homeScore: null, awayScore: null },
  { scoreHome: 1, scoreAway: 0, ahLine: -0.5, ouLine: 2.5 },
  "win"
)

// Tổng = line → hòa kèo
test(
  "OU: Line 2, chọn Tài, tỉ số 1-1 (tổng 2) → THUA (hòa kèo)",
  { betType: "ou", side: "over", homeScore: null, awayScore: null },
  { scoreHome: 1, scoreAway: 1, ahLine: -0.5, ouLine: 2 },
  "loss"
)

test(
  "OU: Line 2, chọn Xỉu, tỉ số 1-1 (tổng 2) → THUA (hòa kèo)",
  { betType: "ou", side: "under", homeScore: null, awayScore: null },
  { scoreHome: 1, scoreAway: 1, ahLine: -0.5, ouLine: 2 },
  "loss"
)

// Line 3.5, tỉ số 3-2 (tổng 5)
test(
  "OU: Line 3.5, chọn Tài, tỉ số 3-2 (tổng 5) → THẮNG",
  { betType: "ou", side: "over", homeScore: null, awayScore: null },
  { scoreHome: 3, scoreAway: 2, ahLine: -0.5, ouLine: 3.5 },
  "win"
)

// Không có ouLine
test(
  "OU: Không set kèo, chọn Tài → THUA",
  { betType: "ou", side: "over", homeScore: null, awayScore: null },
  { scoreHome: 3, scoreAway: 2, ahLine: -0.5, ouLine: null },
  "loss"
)

// ─── 1X2 ──────────────────────────────────────

console.log("── 1X2 ──\n")

test(
  "1X2: Chọn Nhà, tỉ số 2-1 → THẮNG",
  { betType: "1x2", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null },
  "win"
)

test(
  "1X2: Chọn Nhà, tỉ số 0-1 → THUA",
  { betType: "1x2", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 0, scoreAway: 1, ahLine: null, ouLine: null },
  "loss"
)

test(
  "1X2: Chọn Hòa, tỉ số 1-1 → THẮNG",
  { betType: "1x2", side: "draw", homeScore: null, awayScore: null },
  { scoreHome: 1, scoreAway: 1, ahLine: null, ouLine: null },
  "win"
)

test(
  "1X2: Chọn Hòa, tỉ số 2-1 → THUA",
  { betType: "1x2", side: "draw", homeScore: null, awayScore: null },
  { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null },
  "loss"
)

test(
  "1X2: Chọn Khách, tỉ số 0-3 → THẮNG",
  { betType: "1x2", side: "away", homeScore: null, awayScore: null },
  { scoreHome: 0, scoreAway: 3, ahLine: null, ouLine: null },
  "win"
)

test(
  "1X2: Chọn Khách, tỉ số 0-0 → THUA (hòa, không phải khách thắng)",
  { betType: "1x2", side: "away", homeScore: null, awayScore: null },
  { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: null },
  "loss"
)

// ─── TỈ SỐ CHÍNH XÁC ─────────────────────────

console.log("── TỈ SỐ CHÍNH XÁC (Exact) ──\n")

test(
  "Exact: Đoán 2-1, thực tế 2-1 → THẮNG",
  { betType: "exact", side: null, homeScore: 2, awayScore: 1 },
  { scoreHome: 2, scoreAway: 1, ahLine: null, ouLine: null },
  "win"
)

test(
  "Exact: Đoán 2-1, thực tế 1-2 → THUA (ngược)",
  { betType: "exact", side: null, homeScore: 2, awayScore: 1 },
  { scoreHome: 1, scoreAway: 2, ahLine: null, ouLine: null },
  "loss"
)

test(
  "Exact: Đoán 0-0, thực tế 0-0 → THẮNG",
  { betType: "exact", side: null, homeScore: 0, awayScore: 0 },
  { scoreHome: 0, scoreAway: 0, ahLine: null, ouLine: null },
  "win"
)

test(
  "Exact: Đoán 3-2, thực tế 3-1 → THUA (sai 1 số)",
  { betType: "exact", side: null, homeScore: 3, awayScore: 2 },
  { scoreHome: 3, scoreAway: 1, ahLine: null, ouLine: null },
  "loss"
)

// ─── EDGE CASES ───────────────────────────────

console.log("── EDGE CASES ──\n")

test(
  "Loại kèo không xác định → THUA",
  { betType: "unknown", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 1, scoreAway: 0, ahLine: null, ouLine: null },
  "loss"
)

// Tỉ số lớn
test(
  "AH: Home -3.5, tỉ số 7-2 (diff=5), chọn Nhà → THẮNG",
  { betType: "ah", side: "home", homeScore: null, awayScore: null },
  { scoreHome: 7, scoreAway: 2, ahLine: -3.5, ouLine: 5.5 },
  "win"
)

test(
  "OU: Line 0.5, tỉ số 0-0 (tổng 0), chọn Xỉu → THẮNG",
  { betType: "ou", side: "under", homeScore: null, awayScore: null },
  { scoreHome: 0, scoreAway: 0, ahLine: 0, ouLine: 0.5 },
  "win"
)

// ─── KẾT QUẢ ──────────────────────────────────

console.log("═══════════════════════════════════════════")
console.log(`  KẾT QUẢ: ${passed} PASSED / ${failed} FAILED / ${passed + failed} TOTAL`)
console.log("═══════════════════════════════════════════")

if (failed > 0) {
  process.exit(1)
}
