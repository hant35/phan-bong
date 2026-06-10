import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

/* ── Team metadata ── */
const T: Record<string, { flag: string; color: string }> = {
  "Mexico":         { flag: "mx", color: "#006847" },
  "Nam Phi":        { flag: "za", color: "#FFB81C" },
  "Hàn Quốc":      { flag: "kr", color: "#C60C30" },
  "Czechia":        { flag: "cz", color: "#11457E" },
  "Canada":         { flag: "ca", color: "#FF0000" },
  "Bosnia":         { flag: "ba", color: "#002395" },
  "Qatar":          { flag: "qa", color: "#8A1538" },
  "Thụy Sĩ":       { flag: "ch", color: "#FF0000" },
  "Brazil":         { flag: "br", color: "#009c3b" },
  "Morocco":        { flag: "ma", color: "#C1272D" },
  "Haiti":          { flag: "ht", color: "#00209F" },
  "Scotland":       { flag: "gb-sct", color: "#003078" },
  "Mỹ":             { flag: "us", color: "#002868" },
  "Paraguay":       { flag: "py", color: "#DA121A" },
  "Úc":             { flag: "au", color: "#FFCD00" },
  "Thổ Nhĩ Kỳ":    { flag: "tr", color: "#E30A17" },
  "Đức":            { flag: "de", color: "#000000" },
  "Curaçao":        { flag: "cw", color: "#002B7F" },
  "Bờ Biển Ngà":    { flag: "ci", color: "#F77F00" },
  "Ecuador":        { flag: "ec", color: "#FFD100" },
  "Hà Lan":         { flag: "nl", color: "#FF6600" },
  "Nhật Bản":       { flag: "jp", color: "#000080" },
  "Thụy Điển":      { flag: "se", color: "#006AA7" },
  "Tunisia":        { flag: "tn", color: "#E70013" },
  "Bỉ":             { flag: "be", color: "#ED2939" },
  "Ai Cập":         { flag: "eg", color: "#CE1126" },
  "Iran":           { flag: "ir", color: "#239F40" },
  "New Zealand":    { flag: "nz", color: "#000000" },
  "Tây Ban Nha":    { flag: "es", color: "#AA151B" },
  "Cape Verde":     { flag: "cv", color: "#003893" },
  "Ả Rập Xê Út":   { flag: "sa", color: "#006C35" },
  "Uruguay":        { flag: "uy", color: "#5CBFEB" },
  "Pháp":           { flag: "fr", color: "#002395" },
  "Senegal":        { flag: "sn", color: "#00853F" },
  "Iraq":           { flag: "iq", color: "#007A3D" },
  "Na Uy":          { flag: "no", color: "#EF2B2D" },
  "Argentina":      { flag: "ar", color: "#74ACDF" },
  "Algeria":        { flag: "dz", color: "#006233" },
  "Áo":             { flag: "at", color: "#ED2939" },
  "Jordan":         { flag: "jo", color: "#007A3D" },
  "Bồ Đào Nha":    { flag: "pt", color: "#006600" },
  "CHDC Congo":     { flag: "cd", color: "#007FFF" },
  "Uzbekistan":     { flag: "uz", color: "#1EB53A" },
  "Colombia":       { flag: "co", color: "#FCD116" },
  "Anh":            { flag: "gb-eng", color: "#CF081F" },
  "Croatia":        { flag: "hr", color: "#FF0000" },
  "Ghana":          { flag: "gh", color: "#006B3F" },
  "Panama":         { flag: "pa", color: "#DA121A" },
}

/* ── Venues ── */
const V: Record<string, string> = {
  "Mexico City":      "Estadio Azteca, Ciudad de México",
  "Zapopan":          "Estadio Akron, Guadalajara",
  "Monterrey":        "Estadio BBVA, Monterrey",
  "Toronto":          "BMO Field, Toronto",
  "Vancouver":        "BC Place, Vancouver",
  "East Rutherford":  "MetLife Stadium, New York",
  "Inglewood":        "SoFi Stadium, Los Angeles",
  "Arlington":        "AT&T Stadium, Dallas",
  "Houston":          "NRG Stadium, Houston",
  "Philadelphia":     "Lincoln Financial Field, Philadelphia",
  "Miami Gardens":    "Hard Rock Stadium, Miami",
  "Seattle":          "Lumen Field, Seattle",
  "Santa Clara":      "Levi's Stadium, San Francisco",
  "Kansas City":      "GEHA Field, Kansas City",
  "Atlanta":          "Mercedes-Benz Stadium, Atlanta",
  "Foxborough":       "Gillette Stadium, Boston",
}

/* ── Helper: ET time → UTC Date ── */
function et(month: number, day: number, hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, month - 1, day, hour + 4, minute))
}

/* ── All 72 group stage matches ── */
interface MatchInput {
  home: string; away: string; stage: string
  kickoff: Date; venue: string
}

const matches: MatchInput[] = [
  // GROUP A: Mexico, Nam Phi, Hàn Quốc, Czechia
  { home: "Mexico",    away: "Nam Phi",    stage: "Bảng A", kickoff: et(6,11,13),    venue: V["Mexico City"] },
  { home: "Hàn Quốc", away: "Czechia",    stage: "Bảng A", kickoff: et(6,11,22),    venue: V["Zapopan"] },
  { home: "Czechia",   away: "Nam Phi",    stage: "Bảng A", kickoff: et(6,18,12),    venue: V["Atlanta"] },
  { home: "Mexico",    away: "Hàn Quốc",  stage: "Bảng A", kickoff: et(6,18,23),    venue: V["Zapopan"] },
  { home: "Mexico",    away: "Czechia",    stage: "Bảng A", kickoff: et(6,24,21),    venue: V["Mexico City"] },
  { home: "Hàn Quốc", away: "Nam Phi",    stage: "Bảng A", kickoff: et(6,24,21),    venue: V["Monterrey"] },

  // GROUP B
  { home: "Canada",    away: "Bosnia",     stage: "Bảng B", kickoff: et(6,12,15),    venue: V["Toronto"] },
  { home: "Qatar",     away: "Thụy Sĩ",   stage: "Bảng B", kickoff: et(6,13,15),    venue: V["Santa Clara"] },
  { home: "Thụy Sĩ",  away: "Bosnia",     stage: "Bảng B", kickoff: et(6,18,15),    venue: V["Inglewood"] },
  { home: "Canada",    away: "Qatar",      stage: "Bảng B", kickoff: et(6,18,18),    venue: V["Vancouver"] },
  { home: "Bosnia",    away: "Qatar",      stage: "Bảng B", kickoff: et(6,24,15),    venue: V["Seattle"] },
  { home: "Thụy Sĩ",  away: "Canada",     stage: "Bảng B", kickoff: et(6,24,15),    venue: V["Vancouver"] },

  // GROUP C
  { home: "Brazil",    away: "Morocco",    stage: "Bảng C", kickoff: et(6,13,18),    venue: V["East Rutherford"] },
  { home: "Haiti",     away: "Scotland",   stage: "Bảng C", kickoff: et(6,13,21),    venue: V["Foxborough"] },
  { home: "Scotland",  away: "Morocco",    stage: "Bảng C", kickoff: et(6,19,18),    venue: V["Foxborough"] },
  { home: "Brazil",    away: "Haiti",      stage: "Bảng C", kickoff: et(6,19,21),    venue: V["Philadelphia"] },
  { home: "Scotland",  away: "Brazil",     stage: "Bảng C", kickoff: et(6,24,18),    venue: V["Miami Gardens"] },
  { home: "Morocco",   away: "Haiti",      stage: "Bảng C", kickoff: et(6,24,18),    venue: V["Atlanta"] },

  // GROUP D
  { home: "Mỹ",           away: "Paraguay",     stage: "Bảng D", kickoff: et(6,12,21),    venue: V["Inglewood"] },
  { home: "Úc",           away: "Thổ Nhĩ Kỳ",  stage: "Bảng D", kickoff: et(6,13,0),     venue: V["Vancouver"] },
  { home: "Mỹ",           away: "Úc",           stage: "Bảng D", kickoff: et(6,19,15),    venue: V["Seattle"] },
  { home: "Thổ Nhĩ Kỳ",  away: "Paraguay",     stage: "Bảng D", kickoff: et(6,20,0),     venue: V["Santa Clara"] },
  { home: "Thổ Nhĩ Kỳ",  away: "Mỹ",           stage: "Bảng D", kickoff: et(6,25,22),    venue: V["Inglewood"] },
  { home: "Paraguay",     away: "Úc",           stage: "Bảng D", kickoff: et(6,25,22),    venue: V["Santa Clara"] },

  // GROUP E
  { home: "Đức",           away: "Curaçao",       stage: "Bảng E", kickoff: et(6,14,13),    venue: V["Houston"] },
  { home: "Bờ Biển Ngà",  away: "Ecuador",       stage: "Bảng E", kickoff: et(6,14,19),    venue: V["Philadelphia"] },
  { home: "Đức",           away: "Bờ Biển Ngà",  stage: "Bảng E", kickoff: et(6,20,16),    venue: V["Toronto"] },
  { home: "Ecuador",       away: "Curaçao",       stage: "Bảng E", kickoff: et(6,20,20),    venue: V["Kansas City"] },
  { home: "Ecuador",       away: "Đức",           stage: "Bảng E", kickoff: et(6,25,16),    venue: V["East Rutherford"] },
  { home: "Curaçao",       away: "Bờ Biển Ngà",  stage: "Bảng E", kickoff: et(6,25,16),    venue: V["Philadelphia"] },

  // GROUP F
  { home: "Hà Lan",       away: "Nhật Bản",     stage: "Bảng F", kickoff: et(6,14,16),    venue: V["Arlington"] },
  { home: "Thụy Điển",    away: "Tunisia",      stage: "Bảng F", kickoff: et(6,14,22),    venue: V["Monterrey"] },
  { home: "Hà Lan",       away: "Thụy Điển",    stage: "Bảng F", kickoff: et(6,20,13),    venue: V["Houston"] },
  { home: "Tunisia",      away: "Nhật Bản",     stage: "Bảng F", kickoff: et(6,21,0),     venue: V["Monterrey"] },
  { home: "Nhật Bản",     away: "Thụy Điển",    stage: "Bảng F", kickoff: et(6,25,19),    venue: V["Arlington"] },
  { home: "Tunisia",      away: "Hà Lan",       stage: "Bảng F", kickoff: et(6,25,19),    venue: V["Kansas City"] },

  // GROUP G
  { home: "Bỉ",           away: "Ai Cập",       stage: "Bảng G", kickoff: et(6,15,18),    venue: V["Seattle"] },
  { home: "Iran",          away: "New Zealand",  stage: "Bảng G", kickoff: et(6,16,0),     venue: V["Inglewood"] },
  { home: "Bỉ",           away: "Iran",          stage: "Bảng G", kickoff: et(6,21,15),    venue: V["Inglewood"] },
  { home: "New Zealand",  away: "Ai Cập",       stage: "Bảng G", kickoff: et(6,21,21),    venue: V["Vancouver"] },
  { home: "Ai Cập",       away: "Iran",          stage: "Bảng G", kickoff: et(6,26,23),    venue: V["Seattle"] },
  { home: "New Zealand",  away: "Bỉ",           stage: "Bảng G", kickoff: et(6,26,23),    venue: V["Vancouver"] },

  // GROUP H
  { home: "Tây Ban Nha",  away: "Cape Verde",    stage: "Bảng H", kickoff: et(6,15,13),    venue: V["Atlanta"] },
  { home: "Ả Rập Xê Út", away: "Uruguay",       stage: "Bảng H", kickoff: et(6,15,18),    venue: V["Miami Gardens"] },
  { home: "Tây Ban Nha",  away: "Ả Rập Xê Út",  stage: "Bảng H", kickoff: et(6,21,12),    venue: V["Atlanta"] },
  { home: "Uruguay",      away: "Cape Verde",    stage: "Bảng H", kickoff: et(6,21,18),    venue: V["Miami Gardens"] },
  { home: "Cape Verde",   away: "Ả Rập Xê Út",  stage: "Bảng H", kickoff: et(6,26,20),    venue: V["Houston"] },
  { home: "Uruguay",      away: "Tây Ban Nha",   stage: "Bảng H", kickoff: et(6,26,20),    venue: V["Zapopan"] },

  // GROUP I
  { home: "Pháp",         away: "Senegal",       stage: "Bảng I", kickoff: et(6,16,15),    venue: V["East Rutherford"] },
  { home: "Iraq",          away: "Na Uy",         stage: "Bảng I", kickoff: et(6,16,18),    venue: V["Foxborough"] },
  { home: "Pháp",         away: "Iraq",           stage: "Bảng I", kickoff: et(6,22,17),    venue: V["Philadelphia"] },
  { home: "Na Uy",        away: "Senegal",       stage: "Bảng I", kickoff: et(6,22,20),    venue: V["East Rutherford"] },
  { home: "Na Uy",        away: "Pháp",          stage: "Bảng I", kickoff: et(6,26,15),    venue: V["Foxborough"] },
  { home: "Senegal",      away: "Iraq",           stage: "Bảng I", kickoff: et(6,26,15),    venue: V["Toronto"] },

  // GROUP J
  { home: "Argentina",    away: "Algeria",       stage: "Bảng J", kickoff: et(6,16,21),    venue: V["Kansas City"] },
  { home: "Áo",           away: "Jordan",        stage: "Bảng J", kickoff: et(6,17,0),     venue: V["Santa Clara"] },
  { home: "Argentina",    away: "Áo",            stage: "Bảng J", kickoff: et(6,22,13),    venue: V["Arlington"] },
  { home: "Jordan",       away: "Algeria",       stage: "Bảng J", kickoff: et(6,22,23),    venue: V["Santa Clara"] },
  { home: "Algeria",      away: "Áo",            stage: "Bảng J", kickoff: et(6,27,22),    venue: V["Kansas City"] },
  { home: "Jordan",       away: "Argentina",     stage: "Bảng J", kickoff: et(6,27,22),    venue: V["Arlington"] },

  // GROUP K
  { home: "Bồ Đào Nha",   away: "CHDC Congo",    stage: "Bảng K", kickoff: et(6,17,13),    venue: V["Houston"] },
  { home: "Uzbekistan",   away: "Colombia",      stage: "Bảng K", kickoff: et(6,17,22),    venue: V["Mexico City"] },
  { home: "Bồ Đào Nha",   away: "Uzbekistan",    stage: "Bảng K", kickoff: et(6,23,13),    venue: V["Houston"] },
  { home: "Colombia",     away: "CHDC Congo",    stage: "Bảng K", kickoff: et(6,23,22),    venue: V["Zapopan"] },
  { home: "Colombia",     away: "Bồ Đào Nha",    stage: "Bảng K", kickoff: et(6,27,19,30), venue: V["Miami Gardens"] },
  { home: "CHDC Congo",   away: "Uzbekistan",    stage: "Bảng K", kickoff: et(6,27,19,30), venue: V["Atlanta"] },

  // GROUP L
  { home: "Anh",          away: "Croatia",       stage: "Bảng L", kickoff: et(6,17,16),    venue: V["Arlington"] },
  { home: "Ghana",        away: "Panama",        stage: "Bảng L", kickoff: et(6,17,19),    venue: V["Toronto"] },
  { home: "Anh",          away: "Ghana",         stage: "Bảng L", kickoff: et(6,23,16),    venue: V["Foxborough"] },
  { home: "Panama",       away: "Croatia",       stage: "Bảng L", kickoff: et(6,23,19),    venue: V["Toronto"] },
  { home: "Panama",       away: "Anh",           stage: "Bảng L", kickoff: et(6,27,17),    venue: V["East Rutherford"] },
  { home: "Croatia",      away: "Ghana",         stage: "Bảng L", kickoff: et(6,27,17),    venue: V["Philadelphia"] },
]

/* ── Badges ── */
const BADGES = [
  { code: "mat_than",     name: "Mắt Thần Tỉ Số",       emoji: "🎯", description: "Đoán đúng tỉ số 3 lần" },
  { code: "nguoc_dong",   name: "Đi Ngược Dòng",         emoji: "🌊", description: "3 lần pick khác đa số và đúng" },
  { code: "cu_lua",       name: "Cú Lừa Thế Kỷ",         emoji: "🎩", description: "Đoán đúng khi <10% chọn" },
  { code: "luon_leo",     name: "Lươn Lẹo",              emoji: "🐍", description: "Sửa pick 3+ lần trước khi khóa" },
  { code: "dem_khuya",    name: "Thần Phán Đêm Khuya",   emoji: "🌙", description: "Pick lúc 1–5h sáng" },
  { code: "tau_lua",      name: "Tàu Lửa Tất Tay",       emoji: "🚂", description: "Double-down sai 3 lần" },
  { code: "sieu_nhan",    name: "Siêu Nhân Dự Đoán",     emoji: "🦸", description: "Streak 5 trận đúng liên tiếp" },
  { code: "thua_hoai",    name: "Thua Hoài Không Chán",   emoji: "😢", description: "Sai 5 trận liên tiếp" },
  { code: "vua_exact",    name: "Vua Tỉ Số Chính Xác",   emoji: "👑", description: "Đoán đúng tỉ số 5 lần" },
  { code: "dao_keo",      name: "Đạo Kèo Thượng Thừa",   emoji: "⚔️", description: "Thắng 10 kèo chấp liên tiếp" },
]

/* ── 20 Users ── */
const USERS = [
  { email: "ban@phanbong.vn",      name: "Bạn",              displayName: "Thần Phán Newbie",       avatar: "BN",  role: "admin" },
  { email: "phan@phanbong.vn",     name: "Trần Văn Phán",    displayName: "Thần Phán Đêm Khuya",   avatar: "TVP", role: "user" },
  { email: "du@phanbong.vn",       name: "Nguyễn Thị Dự",    displayName: "Vua Tài Xỉu",           avatar: "NTD", role: "user" },
  { email: "doan@phanbong.vn",     name: "Lê Minh Đoán",     displayName: "Cao Thủ Kèo Chấp",      avatar: "LMĐ", role: "user" },
  { email: "keo@phanbong.vn",      name: "Phạm Quang Kèo",   displayName: "Người Đi Ngược Dòng",   avatar: "PQK", role: "user" },
  { email: "linh@phanbong.vn",     name: "Hoàng Thị Linh",   displayName: "Nữ Hoàng Dự Đoán",      avatar: "HTL", role: "user" },
  { email: "tuan@phanbong.vn",     name: "Nguyễn Anh Tuấn",  displayName: "Pháo Thủ Kèo",          avatar: "NAT", role: "admin" },
  { email: "hoa@phanbong.vn",      name: "Trần Thanh Hoa",   displayName: "Hoa Hậu Phán",          avatar: "TTH", role: "user" },
  { email: "minh@phanbong.vn",     name: "Lê Quốc Minh",     displayName: "Minh Triết Gia",         avatar: "LQM", role: "user" },
  { email: "nga@phanbong.vn",      name: "Phạm Thu Nga",     displayName: "Bà Tiên Kèo",           avatar: "PTN", role: "user" },
  { email: "dat@phanbong.vn",      name: "Vũ Thành Đạt",     displayName: "Đạt Phán Thần",         avatar: "VTĐ", role: "user" },
  { email: "huong@phanbong.vn",    name: "Ngô Thị Hương",    displayName: "Hương Vị Chiến Thắng",  avatar: "NTH", role: "user" },
  { email: "long@phanbong.vn",     name: "Bùi Hoàng Long",   displayName: "Long Phong Tài Xỉu",    avatar: "BHL", role: "user" },
  { email: "thao@phanbong.vn",     name: "Đỗ Phương Thảo",   displayName: "Thảo Dược Phán",        avatar: "ĐPT", role: "user" },
  { email: "duc@phanbong.vn",      name: "Trịnh Quốc Đức",   displayName: "Đức Tin Kèo Ngược",     avatar: "TQĐ", role: "user" },
  { email: "mai@phanbong.vn",      name: "Lý Thị Mai",       displayName: "Mai Mắn Đoán Đúng",     avatar: "LTM", role: "user" },
  { email: "cuong@phanbong.vn",    name: "Hồ Văn Cường",     displayName: "Cường Phán Mạnh",        avatar: "HVC", role: "user" },
  { email: "vy@phanbong.vn",       name: "Đinh Ngọc Vy",     displayName: "Vy Kèo Vàng",           avatar: "ĐNV", role: "user" },
  { email: "nam@phanbong.vn",      name: "Cao Trường Nam",    displayName: "Nam Thần Dự Đoán",      avatar: "CTN", role: "user" },
  { email: "hanh@phanbong.vn",     name: "Phan Thị Hạnh",    displayName: "Hạnh Phúc Thắng Kèo",   avatar: "PTH", role: "user" },
]

async function main() {
  console.log("🗑️  Xóa toàn bộ dữ liệu cũ...")
  await prisma.session.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.userBadge.deleteMany()
  await prisma.prediction.deleteMany()
  await prisma.groupMember.deleteMany()
  await prisma.group.deleteMany()
  await prisma.match.deleteMany()
  await prisma.user.deleteMany()
  await prisma.badge.deleteMany()

  // ═══════════════════════════════════════════
  // BADGES (10)
  // ═══════════════════════════════════════════
  console.log("🏅 Tạo 10 badges...")
  for (const b of BADGES) await prisma.badge.create({ data: b })

  // ═══════════════════════════════════════════
  // USERS (20) — tất cả mật khẩu "phanbong123"
  // ═══════════════════════════════════════════
  console.log("👥 Tạo 20 users...")
  const password = await bcrypt.hash("phanbong123", 10)
  const users: any[] = []
  for (const u of USERS) {
    const created = await prisma.user.create({
      data: { email: u.email, passwordHash: password, name: u.name, displayName: u.displayName, avatar: u.avatar, role: u.role },
    })
    users.push(created)
  }

  // ═══════════════════════════════════════════
  // MATCHES (72) — với đa dạng trạng thái
  // ═══════════════════════════════════════════
  console.log("⚽ Tạo 72 trận vòng bảng World Cup 2026...")

  // Giả lập: hôm nay là 2026-06-08 → ngày 11/6 trận đầu
  // Để test đủ trạng thái: set 12 trận đầu = finished, 3 trận = live, còn lại = scheduled
  // Tạo tỉ số giả cho finished/live, set kèo cho tất cả

  const ahLines = [-0.5, -1, -0.75, -1.5, 0, 0.5, -0.25, -2, 0.25, -0.5, -1, -0.75]
  const ouLines = [2.5, 2.25, 2.75, 3.5, 1.5, 2.5, 2, 3, 2.5, 2.75, 2.25, 3.5]

  // Tỉ số cho 12 trận finished
  const finishedScores = [
    { h: 2, a: 1 }, { h: 0, a: 0 }, { h: 1, a: 3 }, { h: 3, a: 3 },
    { h: 4, a: 0 }, { h: 1, a: 1 }, { h: 0, a: 2 }, { h: 2, a: 2 },
    { h: 1, a: 0 }, { h: 3, a: 1 }, { h: 0, a: 1 }, { h: 2, a: 3 },
  ]
  // Tỉ số tạm cho 3 trận live
  const liveScores = [
    { h: 1, a: 0, minute: 34 }, { h: 2, a: 2, minute: 67 }, { h: 0, a: 1, minute: 52 },
  ]

  const createdMatches: any[] = []

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const home = T[m.home]
    const away = T[m.away]
    if (!home || !away) { console.error(`❌ Không tìm thấy đội: ${m.home} hoặc ${m.away}`); continue }

    let status = "scheduled"
    let scoreHome: number | null = null
    let scoreAway: number | null = null
    let minute: number | null = null
    let ahLine: number | null = null
    let ouLine: number | null = null

    if (i < 12) {
      // Finished matches
      status = "finished"
      scoreHome = finishedScores[i].h
      scoreAway = finishedScores[i].a
      ahLine = ahLines[i]
      ouLine = ouLines[i]
    } else if (i < 15) {
      // Live matches
      status = "live"
      const ls = liveScores[i - 12]
      scoreHome = ls.h
      scoreAway = ls.a
      minute = ls.minute
      ahLine = [-0.5, -1, 0.5][i - 12]
      ouLine = [2.5, 2.75, 2][i - 12]
    } else {
      // Scheduled — set kèo cho ~30 trận tiếp theo
      if (i < 45) {
        ahLine = [-0.5, -1, -0.75, -1.5, 0, 0.5, -0.25, -2, 0.25, -0.5,
                  -1, -0.75, -1.5, 0, 0.5, -0.25, -2, 0.25, -0.5, -1,
                  -0.75, -1.5, 0, 0.5, -0.25, -2, 0.25, -0.5, -1, -0.75][i - 15]
        ouLine = [2.5, 2.25, 2.75, 3.5, 1.5, 2.5, 2, 3, 2.5, 2.75,
                  2.25, 3.5, 2.5, 1.5, 2.5, 2, 3, 2.5, 2.75, 2.25,
                  3.5, 2.5, 1.5, 2.5, 2, 3, 2.5, 2.75, 2.25, 3.5][i - 15]
      }
      // Trận 45-71: chưa có kèo (scheduled, no odds)
    }

    // Weather cho matches đã chơi/đang chơi
    const weatherData = (i < 15) ? {
      weatherIcon: ["☀️", "⛅", "🌤️", "🌧️", "☁️"][i % 5],
      weatherTemp: 22 + (i % 8),
      weatherCond: ["Nắng", "Có mây", "Nắng nhẹ", "Mưa nhẹ", "Nhiều mây"][i % 5],
    } : {}

    // H2H cho tất cả trận
    const h2hData = {
      h2hHome: 2 + (i % 4),
      h2hDraw: 1 + (i % 3),
      h2hAway: 1 + (i % 5),
      h2hRecent: ["WWDLW", "LDWWL", "WDWDL", "DLLWW", "WLWDW", "LWWDL"][i % 6],
    }

    const created = await prisma.match.create({
      data: {
        homeTeam: m.home, awayTeam: m.away,
        homeFlag: home.flag, awayFlag: away.flag,
        homeColor: home.color, awayColor: away.color,
        kickoffAt: m.kickoff, stage: `Vòng bảng · ${m.stage}`,
        venue: m.venue, status, scoreHome, scoreAway, minute,
        ahLine, ouLine, ...weatherData, ...h2hData,
      },
    })
    createdMatches.push(created)
  }
  console.log(`   ✅ Đã tạo ${createdMatches.length} trận (12 finished, 3 live, ${createdMatches.length - 15} scheduled)`)

  // ═══════════════════════════════════════════
  // GROUPS (5)
  // ═══════════════════════════════════════════
  console.log("🏟️  Tạo 5 groups...")
  const groups = await Promise.all([
    prisma.group.create({ data: { name: "Hội IT Đoán Bóng",          visibility: "private", inviteCode: "IT26XA", adminId: users[1].id } }),
    prisma.group.create({ data: { name: "WC2026 Fan Club",           visibility: "public",  inviteCode: "WC26FB", adminId: users[3].id } }),
    prisma.group.create({ data: { name: "Anh Em Công Sở",            visibility: "private", inviteCode: "AECS26", adminId: users[6].id } }),
    prisma.group.create({ data: { name: "Dân Chơi Kèo",             visibility: "public",  inviteCode: "DCK26X", adminId: users[0].id } }),
    prisma.group.create({ data: { name: "Siêu Phán Thủ",            visibility: "private", inviteCode: "SPT26Y", adminId: users[9].id } }),
  ])

  // ═══════════════════════════════════════════
  // GROUP MEMBERS (50+)
  // ═══════════════════════════════════════════
  console.log("👤 Tạo memberships...")
  // Helper: tạo stats từ points
  function memberStats(pts: number) {
    const wins = Math.floor(pts * 0.7) + Math.floor(Math.abs(pts * 0.3))
    const losses = Math.max(1, Math.floor(pts * 0.4))
    const skipped = pts < 10 ? Math.floor(pts * 0.15) + 1 : Math.floor(pts * 0.05)
    return { points: pts, wins, losses, skipped }
  }

  // Group 0 "Hội IT": users 0-9 (10 members)
  for (let i = 0; i < 10; i++) {
    const s = memberStats([12, 18, 15, 10, 8, 14, 11, 9, 7, 16][i])
    await prisma.groupMember.create({ data: { userId: users[i].id, groupId: groups[0].id, ...s } })
  }
  // Group 1 "WC2026 Fan Club": users 0-14 (15 members)
  for (let i = 0; i < 15; i++) {
    const s = memberStats([10, 14, 12, 18, 6, 11, 9, 13, 8, 15, 7, 10, 5, 12, 16][i])
    await prisma.groupMember.create({ data: { userId: users[i].id, groupId: groups[1].id, ...s } })
  }
  // Group 2 "Anh Em Công Sở": users 5-14 (10 members)
  for (let i = 5; i < 15; i++) {
    const s = memberStats([13, 17, 8, 11, 15, 6, 10, 14, 9, 12][i - 5])
    await prisma.groupMember.create({ data: { userId: users[i].id, groupId: groups[2].id, ...s } })
  }
  // Group 3 "Dân Chơi Kèo": users 0-4 + 10-19 (15 members)
  const g3users = [0,1,2,3,4,10,11,12,13,14,15,16,17,18,19]
  for (let idx = 0; idx < g3users.length; idx++) {
    const s = memberStats([11,15,13,9,7,8,12,6,14,10,16,5,11,13,9][idx])
    await prisma.groupMember.create({ data: { userId: users[g3users[idx]].id, groupId: groups[3].id, ...s } })
  }
  // Group 4 "Siêu Phán Thủ": users 9-19 (11 members)
  for (let i = 9; i < 20; i++) {
    const s = memberStats([17,13,9,15,11,7,14,10,8,12,16][i - 9])
    await prisma.groupMember.create({ data: { userId: users[i].id, groupId: groups[4].id, ...s } })
  }
  const totalMembers = 10 + 15 + 10 + 15 + 11
  console.log(`   ✅ ${totalMembers} memberships across 5 groups`)

  // ═══════════════════════════════════════════
  // PREDICTIONS (200+) — cho 15 trận đã có kết quả/đang chơi
  // ═══════════════════════════════════════════
  console.log("📊 Tạo predictions...")

  const betTypes = ["ah", "ou", "1x2", "exact"]
  const ahSides = ["home", "away"]
  const ouSides = ["over", "under"]
  const sides1x2 = ["home", "draw", "away"]

  // Tỉ số phổ biến cho exact
  const exactScores = [
    [1,0],[0,0],[2,1],[1,1],[0,1],[2,0],[3,1],[1,2],[2,2],[0,2],[3,0],[3,2],[1,3],[0,3],[4,1],
  ]

  let predCount = 0

  // Predictions cho 12 trận finished: mỗi user đoán 8-12 trận
  for (let matchIdx = 0; matchIdx < 12; matchIdx++) {
    const match = createdMatches[matchIdx]
    const score = finishedScores[matchIdx]

    // 15-20 users đoán mỗi trận
    const numPredictors = 15 + (matchIdx % 6)
    for (let u = 0; u < numPredictors && u < 20; u++) {
      const user = users[u]
      const bt = betTypes[(matchIdx + u) % 4]

      let side: string | null = null
      let homeScore: number | null = null
      let awayScore: number | null = null

      if (bt === "ah") {
        side = ahSides[(matchIdx + u) % 2]
      } else if (bt === "ou") {
        side = ouSides[(matchIdx + u) % 2]
      } else if (bt === "1x2") {
        side = sides1x2[(matchIdx + u) % 3]
      } else {
        // exact — mix đúng và sai
        if ((matchIdx + u) % 5 === 0) {
          // Đoán đúng!
          homeScore = score.h
          awayScore = score.a
        } else {
          const es = exactScores[(matchIdx + u) % exactScores.length]
          homeScore = es[0]
          awayScore = es[1]
        }
      }

      // Tính result cho finished matches
      const diff = score.h - score.a
      const total = score.h + score.a
      let result: "win" | "loss" = "loss"

      if (bt === "ah" && match.ahLine != null) {
        const hr = diff + match.ahLine
        if (side === "home" && hr > 0) result = "win"
        if (side === "away" && hr < 0) result = "win"
      } else if (bt === "ou" && match.ouLine != null) {
        if (side === "over" && total > match.ouLine) result = "win"
        if (side === "under" && total < match.ouLine) result = "win"
      } else if (bt === "1x2") {
        if (side === "home" && diff > 0) result = "win"
        if (side === "draw" && diff === 0) result = "win"
        if (side === "away" && diff < 0) result = "win"
      } else if (bt === "exact") {
        if (homeScore === score.h && awayScore === score.a) result = "win"
      }

      await prisma.prediction.create({
        data: {
          userId: user.id, matchId: match.id, betType: bt,
          side, homeScore, awayScore,
          confidence: 1 + ((matchIdx + u) % 5),
          result, points: result === "win" ? 1 : 0,
        },
      })
      predCount++
    }
  }

  // Predictions cho 3 trận live: 10-15 users mỗi trận, chưa có result
  for (let matchIdx = 12; matchIdx < 15; matchIdx++) {
    const match = createdMatches[matchIdx]
    const numPredictors = 10 + (matchIdx % 4)

    for (let u = 0; u < numPredictors && u < 20; u++) {
      const user = users[u]
      const bt = betTypes[(matchIdx + u) % 4]

      let side: string | null = null
      let homeScore: number | null = null
      let awayScore: number | null = null

      if (bt === "ah") side = ahSides[(matchIdx + u) % 2]
      else if (bt === "ou") side = ouSides[(matchIdx + u) % 2]
      else if (bt === "1x2") side = sides1x2[(matchIdx + u) % 3]
      else {
        const es = exactScores[(matchIdx + u) % exactScores.length]
        homeScore = es[0]; awayScore = es[1]
      }

      await prisma.prediction.create({
        data: {
          userId: user.id, matchId: match.id, betType: bt,
          side, homeScore, awayScore,
          confidence: 1 + ((matchIdx + u) % 5),
          // Chưa có result vì live
        },
      })
      predCount++
    }
  }

  // Predictions cho 10 trận scheduled tiếp (trận 15-24): 5-12 users mỗi trận
  for (let matchIdx = 15; matchIdx < 25; matchIdx++) {
    const match = createdMatches[matchIdx]
    const numPredictors = 5 + (matchIdx % 8)

    for (let u = 0; u < numPredictors && u < 20; u++) {
      const user = users[u]
      const bt = betTypes[(matchIdx + u) % 4]

      let side: string | null = null
      let homeScore: number | null = null
      let awayScore: number | null = null

      if (bt === "ah") side = ahSides[(matchIdx + u) % 2]
      else if (bt === "ou") side = ouSides[(matchIdx + u) % 2]
      else if (bt === "1x2") side = sides1x2[(matchIdx + u) % 3]
      else {
        const es = exactScores[(matchIdx + u) % exactScores.length]
        homeScore = es[0]; awayScore = es[1]
      }

      await prisma.prediction.create({
        data: {
          userId: user.id, matchId: match.id, betType: bt,
          side, homeScore, awayScore,
          confidence: 1 + ((matchIdx + u) % 5),
        },
      })
      predCount++
    }
  }

  // "Skip" predictions cho finished matches — nhóm members thiếu
  let skipCount = 0
  for (let matchIdx = 0; matchIdx < 12; matchIdx++) {
    const match = createdMatches[matchIdx]
    const existingPreds = await prisma.prediction.findMany({ where: { matchId: match.id }, select: { userId: true } })
    const predictedIds = new Set(existingPreds.map(p => p.userId))

    // Chỉ check users 0-9 (group 0 members) — ai không đoán → skip
    for (let u = 0; u < 10; u++) {
      if (!predictedIds.has(users[u].id)) {
        await prisma.prediction.create({
          data: {
            userId: users[u].id, matchId: match.id,
            betType: "skip", side: null, confidence: 0,
            result: "loss", points: 0,
          },
        })
        predCount++
        skipCount++
      }
    }
  }

  console.log(`   ✅ ${predCount} predictions (${skipCount} skipped)`)

  // ═══════════════════════════════════════════
  // Update User stats dựa trên predictions
  // ═══════════════════════════════════════════
  console.log("📈 Cập nhật user stats...")
  for (const user of users) {
    const preds = await prisma.prediction.findMany({
      where: { userId: user.id, result: { not: null } },
    })
    const wins = preds.filter(p => p.result === "win").length
    // Calculate streak from last predictions
    const sorted = preds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    let streak = 0
    for (const p of sorted) {
      if (p.result === "win") streak++
      else break
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { totalPoints: wins, streak },
    })
  }

  // ═══════════════════════════════════════════
  // USER BADGES (50+) — phân bổ cho 20 users
  // ═══════════════════════════════════════════
  console.log("🏅 Gắn badges cho users...")
  const badgeCodes = BADGES.map(b => b.code)
  let badgeCount = 0
  for (let u = 0; u < 20; u++) {
    // Mỗi user 2-5 badges
    const numBadges = 2 + (u % 4)
    const assignedBadges = new Set<string>()
    for (let b = 0; b < numBadges; b++) {
      const code = badgeCodes[(u + b * 3) % badgeCodes.length]
      if (assignedBadges.has(code)) continue
      assignedBadges.add(code)
      await prisma.userBadge.create({
        data: {
          userId: users[u].id,
          badgeCode: code,
          earnedAt: new Date(Date.now() - (20 - u) * 86400000 - b * 3600000),
        },
      })
      badgeCount++
    }
  }
  console.log(`   ✅ ${badgeCount} user badges`)

  // ═══════════════════════════════════════════
  // ACTIVITIES (100+)
  // ═══════════════════════════════════════════
  console.log("📋 Tạo activities...")

  const activityTypes = [
    { type: "prediction", action: "Đã dự đoán", target: "" },
    { type: "join_group", action: "Đã tham gia", target: "" },
    { type: "badge",      action: "Nhận huy hiệu", target: "" },
    { type: "streak",     action: "Streak", target: "" },
    { type: "exact_win",  action: "Đoán đúng tỉ số", target: "" },
    { type: "comment",    action: "Bình luận", target: "" },
  ]

  let actCount = 0

  // Activities cho predictions
  for (let matchIdx = 0; matchIdx < 15; matchIdx++) {
    const match = createdMatches[matchIdx]
    const numActs = 8 + (matchIdx % 5)
    for (let u = 0; u < numActs && u < 20; u++) {
      await prisma.activity.create({
        data: {
          userId: users[u].id,
          groupId: groups[u % groups.length].id,
          type: "prediction",
          action: "Đã dự đoán",
          target: `${match.homeTeam} vs ${match.awayTeam}`,
          meta: JSON.stringify({ matchId: match.id, betType: betTypes[(matchIdx + u) % 4] }),
          createdAt: new Date(match.kickoffAt.getTime() - (3600000 * (1 + u))),
        },
      })
      actCount++
    }
  }

  // Join group activities
  for (let u = 0; u < 20; u++) {
    const numGroups = u < 5 ? 3 : u < 10 ? 2 : 1
    for (let g = 0; g < numGroups && g < groups.length; g++) {
      await prisma.activity.create({
        data: {
          userId: users[u].id,
          groupId: groups[g].id,
          type: "join_group",
          action: "Đã tham gia",
          target: groups[g].name,
          createdAt: new Date(Date.now() - (30 - u) * 86400000),
        },
      })
      actCount++
    }
  }

  // Badge earned activities
  for (let u = 0; u < 15; u++) {
    await prisma.activity.create({
      data: {
        userId: users[u].id,
        type: "badge",
        action: "Nhận huy hiệu",
        target: BADGES[u % BADGES.length].name,
        meta: JSON.stringify({ badge: BADGES[u % BADGES.length].code }),
        createdAt: new Date(Date.now() - (15 - u) * 86400000),
      },
    })
    actCount++
  }

  // Streak activities
  for (let u = 0; u < 10; u++) {
    await prisma.activity.create({
      data: {
        userId: users[u].id,
        groupId: groups[u % groups.length].id,
        type: "streak",
        action: `Streak ${3 + (u % 5)} trận`,
        target: "Đoán đúng liên tiếp",
        createdAt: new Date(Date.now() - u * 86400000),
      },
    })
    actCount++
  }

  // Exact win activities
  for (let u = 0; u < 8; u++) {
    const m = createdMatches[u]
    await prisma.activity.create({
      data: {
        userId: users[u].id,
        groupId: groups[u % groups.length].id,
        type: "exact_win",
        action: "Đoán đúng tỉ số",
        target: `${m.homeTeam} vs ${m.awayTeam}`,
        meta: JSON.stringify({ score: `${finishedScores[u].h}-${finishedScores[u].a}` }),
        createdAt: new Date(m.kickoffAt.getTime() + 7200000),
      },
    })
    actCount++
  }

  console.log(`   ✅ ${actCount} activities`)

  // ═══════════════════════════════════════════
  // COMMENTS (50+)
  // ═══════════════════════════════════════════
  console.log("\n7️⃣  Seeding comments...")
  const chatMessages = [
    "Trận này dễ ăn 🔥", "Kèo thơm quá ae ơi", "Ai đoán tài hông?", "Chấp 0.75 hơi rủi ro nha",
    "Hiệp 1 chắc 0-0", "Đội nhà thắng chắc luôn 💪", "Cửa dưới ngon lắm", "Tỉ số 2-1 cho tui",
    "Mấy ông đoán gì vậy?", "Đặt hết vào cửa trên 🤑", "Kèo này khó quá", "Thôi bỏ trận này",
    "Ai streak 5 rồi? 😱", "Hôm nay tui thấy cửa tài", "Kèo châu Á thơm hơn", "Under 2.5 chắc ăn",
    "Trận này phải all-in", "Đội này form tệ lắm", "Tui đoán hoà nè", "Coi chừng bẫy kèo 🤡",
    "GG trận trước đoán sai hết 💀", "Hôm nay gỡ lại!", "Kèo 0.5 ăn chắc", "Mấy ông tin tui đi",
    "Tui thấy over ngon", "Không biết đoán gì luôn 😂", "Đội khách mạnh hơn", "3-1 cho cửa trên",
    "Ai biết đội hình chính không?", "Thiếu mấy trụ cột rồi", "Kèo thay đổi rồi ae ơi!",
    "Trận này skip thôi", "1-0 nhát dao chắc 🔪", "Tui tin cửa dưới", "Lần trước đoán đúng hết",
    "Haha thua sml 🤦", "Comeback thôi ae!", "Mấy ông đoán tệ quá", "Tui đỉnh nhất hội 👑",
    "Trận khai mạc phải thắng", "Bóng lăn là vui rồi ⚽", "Đặt ít thôi trận này",
    "Ai cùng đoán chấp hông?", "Over 2.5 là chuẩn", "Kèo hạ rồi, nhanh đoán đi!",
    "Tui all-in tài 🔥🔥", "Hiệp 2 mới có bàn", "Trận derby luôn khó", "Bên kia mạnh vcl",
    "Ez game ez life 😎", "Tui đã đoán đúng 10 trận liên tiếp", "Cap thần đây 💫",
  ]

  let commentCount = 0
  const finishedAndLive = createdMatches.filter(m => m.status === "finished" || m.status === "live")
  for (const match of finishedAndLive) {
    const numComments = 3 + Math.floor(Math.random() * 5)
    for (let c = 0; c < numComments; c++) {
      const u = users[Math.floor(Math.random() * users.length)]
      await prisma.comment.create({
        data: {
          userId: u.id,
          matchId: match.id,
          text: chatMessages[(commentCount + c) % chatMessages.length],
          createdAt: new Date(match.kickoffAt.getTime() - 3600000 + c * 600000),
        },
      })
      commentCount++
    }
  }
  console.log(`   ✅ ${commentCount} comments`)

  // ═══════════════════════════════════════════
  // NOTIFICATIONS (50+)
  // ═══════════════════════════════════════════
  console.log("\n8️⃣  Seeding notifications...")
  let notiCount = 0
  const notiTemplates: { type: string; title: string; body: string; needsMatch: boolean }[] = [
    { type: "kickoff_soon", title: "Sắp đá!", body: "Trận đấu sẽ bắt đầu trong 30 phút nữa", needsMatch: true },
    { type: "result", title: "Kết quả trận đấu", body: "Bạn đoán đúng! +1 điểm 🎉", needsMatch: true },
    { type: "result", title: "Kết quả trận đấu", body: "Tiếc quá, lần sau nhé 😢", needsMatch: true },
    { type: "streak", title: "Streak mới! 🔥", body: "Bạn đã đoán đúng 3 trận liên tiếp", needsMatch: false },
    { type: "streak", title: "Siêu streak! 🔥🔥", body: "Bạn đã đoán đúng 5 trận liên tiếp", needsMatch: false },
    { type: "overtaken", title: "Bị vượt mặt! 📈", body: "Có người vừa vượt bạn trên bảng xếp hạng", needsMatch: false },
    { type: "badge", title: "Huy hiệu mới! 🏅", body: "Bạn nhận được huy hiệu 'Thần Dự Đoán'", needsMatch: false },
    { type: "comment", title: "Bình luận mới 💬", body: "Có người bình luận trong trận bạn đang theo dõi", needsMatch: true },
    { type: "goal", title: "BÀN THẮNG! ⚽", body: "Có bàn thắng trong trận đấu bạn đang theo dõi", needsMatch: true },
    { type: "welcome", title: "Chào mừng! 👋", body: "Chào mừng bạn đến Phán Bóng! Hãy bắt đầu dự đoán ngay", needsMatch: false },
  ]

  // Each user gets 3-5 notifications
  for (const u of users) {
    const num = 3 + Math.floor(Math.random() * 3)
    for (let n = 0; n < num; n++) {
      const tmpl = notiTemplates[notiCount % notiTemplates.length]
      const matchForNoti = tmpl.needsMatch ? finishedAndLive[notiCount % finishedAndLive.length] : null
      await prisma.notification.create({
        data: {
          userId: u.id,
          type: tmpl.type,
          title: tmpl.title,
          body: tmpl.body,
          matchId: matchForNoti?.id ?? null,
          read: Math.random() > 0.6, // 40% unread
          createdAt: new Date(Date.now() - notiCount * 1800000),
        },
      })
      notiCount++
    }
  }
  console.log(`   ✅ ${notiCount} notifications`)

  // ═══════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════
  const counts = {
    users: await prisma.user.count(),
    groups: await prisma.group.count(),
    members: await prisma.groupMember.count(),
    matches: await prisma.match.count(),
    predictions: await prisma.prediction.count(),
    badges: await prisma.badge.count(),
    userBadges: await prisma.userBadge.count(),
    activities: await prisma.activity.count(),
    comments: await prisma.comment.count(),
    notifications: await prisma.notification.count(),
  }

  console.log("\n═══════════════════════════════════════════")
  console.log("  ✅ SEED HOÀN TẤT — TỔNG KẾT")
  console.log("═══════════════════════════════════════════")
  console.log(`  👥 Users:        ${counts.users}`)
  console.log(`  🏟️  Groups:       ${counts.groups}`)
  console.log(`  👤 Members:      ${counts.members}`)
  console.log(`  ⚽ Matches:      ${counts.matches} (12 finished, 3 live, ${counts.matches - 15} scheduled)`)
  console.log(`  📊 Predictions:  ${counts.predictions}`)
  console.log(`  🏅 Badges:       ${counts.badges}`)
  console.log(`  🎖️  UserBadges:   ${counts.userBadges}`)
  console.log(`  📋 Activities:   ${counts.activities}`)
  console.log(`  💬 Comments:     ${counts.comments}`)
  console.log(`  🔔 Notifications: ${counts.notifications}`)
  console.log(`\n  🔐 Login: ban@phanbong.vn / phanbong123`)
  console.log(`     (tất cả 20 users cùng mật khẩu)`)

  // Hiển thị bảng xếp hạng
  const topUsers = await prisma.user.findMany({ orderBy: { totalPoints: "desc" }, take: 10 })
  console.log("\n  🏆 TOP 10:")
  topUsers.forEach((u, i) => {
    console.log(`     ${String(i+1).padStart(2)}. ${u.name.padEnd(22)} ${u.totalPoints} điểm | streak ${u.streak}`)
  })

  // Hiển thị trạng thái matches
  console.log("\n  📅 TRẠNG THÁI TRẬN ĐẤU:")
  const matchStatuses = await prisma.match.groupBy({ by: ["status"], _count: true })
  matchStatuses.forEach(s => console.log(`     ${s.status.padEnd(12)} ${s._count} trận`))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
