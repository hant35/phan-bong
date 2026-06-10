export const TEAM_META: Record<string, { flag: string; color1: string; color2: string; form: ("W"|"D"|"L")[] }> = {
  "Brazil":       { flag: "br", color1: "#009c3b", color2: "#FFDF00", form: ["W","W","D","W","W"] },
  "Mexico":       { flag: "mx", color1: "#006847", color2: "#CE1126", form: ["L","W","D","L","W"] },
  "Argentina":    { flag: "ar", color1: "#74ACDF", color2: "#ffffff", form: ["W","W","W","D","W"] },
  "Saudi Arabia": { flag: "sa", color1: "#006C35", color2: "#ffffff", form: ["D","L","W","L","D"] },
  "Pháp":         { flag: "fr", color1: "#002395", color2: "#ED2939", form: ["W","W","W","L","W"] },
  "Đức":          { flag: "de", color1: "#000000", color2: "#DD0000", form: ["D","W","L","W","W"] },
  "Tây Ban Nha":  { flag: "es", color1: "#AA151B", color2: "#F1BF00", form: ["W","W","W","W","D"] },
  "Morocco":      { flag: "ma", color1: "#C1272D", color2: "#006233", form: ["W","D","W","L","D"] },
  "Anh":          { flag: "gb-eng", color1: "#CF081F", color2: "#ffffff", form: ["W","W","D","W","W"] },
  "Iran":         { flag: "ir", color1: "#239F40", color2: "#DA0000", form: ["L","D","L","W","L"] },
}

export function flagUrl(code: string) {
  return `https://flagcdn.com/w160/${code}.png`
}

export const mockMatches = [
  {
    id: "1",
    homeTeam: "Brazil",
    awayTeam: "Mexico",
    kickoffAt: new Date(Date.now() + 5 * 60 * 1000),
    stage: "Vòng bảng · Bảng A",
    venue: "MetLife Stadium, New York",
    status: "scheduled" as const,
    ahLine: -1.5,
    ouLine: 2.5,
    myPick: null,
    groupConsensus: { home: 72, draw: 10, away: 18 },
    predictorsCount: 18,
    h2h: { homeWins: 4, draws: 2, awayWins: 1, recentResults: ["2-0","1-0","3-1","1-2","2-1"] },
  },
  {
    id: "2",
    homeTeam: "Argentina",
    awayTeam: "Saudi Arabia",
    kickoffAt: new Date(Date.now() - 35 * 60 * 1000),
    stage: "Vòng bảng · Bảng B",
    venue: "SoFi Stadium, Los Angeles",
    status: "live" as const,
    scoreHome: 1,
    scoreAway: 0,
    minute: 54,
    ahLine: -2.5,
    ouLine: 3.0,
    myPick: { type: "ah", side: "home" },
    groupConsensus: { home: 85, draw: 5, away: 10 },
    predictorsCount: 24,
    h2h: { homeWins: 3, draws: 1, awayWins: 1, recentResults: ["3-0","1-0","2-2","4-0","1-0"] },
  },
  {
    id: "3",
    homeTeam: "Pháp",
    awayTeam: "Đức",
    kickoffAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    stage: "Vòng bảng · Bảng C",
    venue: "AT&T Stadium, Dallas",
    status: "scheduled" as const,
    ahLine: -0.5,
    ouLine: 2.5,
    myPick: { type: "ou", side: "over" },
    groupConsensus: { home: 48, draw: 20, away: 32 },
    predictorsCount: 21,
    h2h: { homeWins: 8, draws: 6, awayWins: 7, recentResults: ["1-0","2-3","0-0","2-1","1-2"] },
  },
  {
    id: "4",
    homeTeam: "Tây Ban Nha",
    awayTeam: "Morocco",
    kickoffAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    stage: "Vòng bảng · Bảng D",
    venue: "Rose Bowl, Los Angeles",
    status: "finished" as const,
    scoreHome: 2,
    scoreAway: 1,
    ahLine: -1.5,
    ouLine: 2.5,
    myPick: { type: "exact", home: 2, away: 0 },
    groupConsensus: { home: 68, draw: 12, away: 20 },
    predictorsCount: 22,
    myResult: "loss",
    myPoints: -15,
    h2h: { homeWins: 5, draws: 1, awayWins: 0, recentResults: ["3-1","2-0","3-2","1-0","2-0"] },
  },
  {
    id: "5",
    homeTeam: "Anh",
    awayTeam: "Iran",
    kickoffAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    stage: "Vòng bảng · Bảng E",
    venue: "Levi's Stadium, San Francisco",
    status: "scheduled" as const,
    ahLine: -2.0,
    ouLine: 3.5,
    myPick: null,
    groupConsensus: { home: 76, draw: 14, away: 10 },
    predictorsCount: 15,
    h2h: { homeWins: 2, draws: 0, awayWins: 0, recentResults: ["6-2","2-0"] },
  },
]

export const mockLeaderboard = [
  { rank: 1, name: "Trần Văn Phán", displayName: "Thần Phán Đêm Khuya", avatar: "TVP", points: 285, correct: 18, total: 22, streak: 4, trend: +2, badges: ["🎯", "🔥"] },
  { rank: 2, name: "Nguyễn Thị Dự", displayName: "Vua Tài Xỉu", avatar: "NTD", points: 260, correct: 16, total: 22, streak: 2, trend: 0, badges: ["🎰"] },
  { rank: 3, name: "Lê Minh Đoán", displayName: "Cao Thủ Kèo Chấp", avatar: "LMD", points: 245, correct: 15, total: 22, streak: 1, trend: -1, badges: ["🏆"] },
  { rank: 4, name: "Phạm Quang Kèo", displayName: "Người Đi Ngược Dòng", avatar: "PQK", points: 220, correct: 14, total: 22, streak: 0, trend: +3, badges: ["🌊"] },
  { rank: 5, name: "Hoàng Tiến Sỹ", displayName: "Tín Đồ Argentina", avatar: "HTS", points: 195, correct: 12, total: 22, streak: 0, trend: -2, badges: [] },
  { rank: 6, name: "Bạn", displayName: "Thần Phán Newbie", avatar: "BN", points: 180, correct: 11, total: 22, streak: 0, trend: +1, badges: [], isMe: true },
  { rank: 7, name: "Vũ Đức Mơ", displayName: "Vua Chầu Rìa", avatar: "VDM", points: 155, correct: 10, total: 22, streak: 0, trend: -3, badges: ["🤡"] },
]

export const mockGroups = [
  {
    id: "1",
    name: "Hội IT Đoán Bóng",
    memberCount: 24,
    myRank: 6,
    totalPoints: 180,
    visibility: "private" as const,
    inviteCode: "IT26XA",
    recentActivity: "Lê Minh Đoán vừa đoán Brazil thắng 2-0",
  },
  {
    id: "2",
    name: "WC2026 Public Fan Club",
    memberCount: 312,
    myRank: 87,
    totalPoints: 180,
    visibility: "public" as const,
    inviteCode: "WC26FB",
    recentActivity: "89 người đã đoán trận Brazil vs Mexico",
  },
]

export const mockActivityFeed = [
  { id: "a1", type: "pick", user: "Lê Minh Đoán", avatar: "LMD", action: "vừa đoán", target: "Brazil 2-0 Mexico", betType: "Tỉ số chính xác", time: "2 phút", color: "#ec4899" },
  { id: "a2", type: "win", user: "Trần Văn Phán", avatar: "TVP", action: "thắng", target: "+25 xu (Argentina chấp -2.5)", time: "8 phút", color: "#00e676" },
  { id: "a3", type: "join", user: "Phạm Quang Kèo", avatar: "PQK", action: "vừa tham gia hội", target: "Hội IT Đoán Bóng", time: "15 phút", color: "#00bcd4" },
  { id: "a4", type: "badge", user: "Nguyễn Thị Dự", avatar: "NTD", action: "nhận badge mới", target: "🎰 Vua Tài Xỉu", time: "30 phút", color: "#ffd700" },
  { id: "a5", type: "loss", user: "Vũ Đức Mơ", avatar: "VDM", action: "thua", target: "-15 xu (Tây Ban Nha tỉ số 2-0)", time: "1 giờ", color: "#ff5252" },
  { id: "a6", type: "comment", user: "Hoàng Tiến Sỹ", avatar: "HTS", action: "bình luận", target: "trong trận Pháp vs Đức", time: "2 giờ", color: "#7c3aed" },
  { id: "a7", type: "rank", user: "Bạn", avatar: "BN", action: "lên hạng", target: "#6 (+1)", time: "3 giờ", color: "#00e676" },
  { id: "a8", type: "pick", user: "Trần Văn Phán", avatar: "TVP", action: "vừa đoán", target: "Anh chấp -2 vs Iran", betType: "Kèo chấp", time: "4 giờ", color: "#ec4899" },
]

export const mockRecentPicks = [
  { id: "p1", match: "Tây Ban Nha vs Morocco", homeFlag: "es", awayFlag: "ma", pickLabel: "TBN tỉ số 2-0", betType: "exact", confidence: 4, result: "loss", points: -15, kickoffAt: new Date(Date.now() - 4*3600000), actualScore: "2-1" },
  { id: "p2", match: "Argentina vs Saudi Arabia", homeFlag: "ar", awayFlag: "sa", pickLabel: "Argentina chấp -2.5", betType: "ah", confidence: 5, result: "live", points: 0, kickoffAt: new Date(Date.now() - 35*60000), actualScore: "1-0 (54')" },
  { id: "p3", match: "Pháp vs Đức", homeFlag: "fr", awayFlag: "de", pickLabel: "Tài 2.5", betType: "ou", confidence: 3, result: "pending", points: 0, kickoffAt: new Date(Date.now() + 3*3600000), actualScore: null },
  { id: "p4", match: "Hà Lan vs Bỉ", homeFlag: "nl", awayFlag: "be", pickLabel: "Hà Lan thắng", betType: "1x2", confidence: 4, result: "win", points: 18, kickoffAt: new Date(Date.now() - 26*3600000), actualScore: "3-1" },
  { id: "p5", match: "Ý vs Croatia", homeFlag: "it", awayFlag: "hr", pickLabel: "Hòa", betType: "1x2", confidence: 2, result: "loss", points: -8, kickoffAt: new Date(Date.now() - 50*3600000), actualScore: "0-2" },
  { id: "p6", match: "Bồ Đào Nha vs Ghana", homeFlag: "pt", awayFlag: "gh", pickLabel: "BĐN chấp -1.5", betType: "ah", confidence: 4, result: "win", points: 22, kickoffAt: new Date(Date.now() - 74*3600000), actualScore: "3-0" },
  { id: "p7", match: "Nhật Bản vs Costa Rica", homeFlag: "jp", awayFlag: "cr", pickLabel: "Xỉu 2.5", betType: "ou", confidence: 3, result: "win", points: 12, kickoffAt: new Date(Date.now() - 98*3600000), actualScore: "1-0" },
  { id: "p8", match: "Hàn Quốc vs Uruguay", homeFlag: "kr", awayFlag: "uy", pickLabel: "Hàn Quốc tỉ số 1-1", betType: "exact", confidence: 2, result: "loss", points: -10, kickoffAt: new Date(Date.now() - 122*3600000), actualScore: "0-0" },
]

// Xu evolution last 14 days
export const mockPointsTimeline = [
  { day: "T2", points: 120, delta: 0 },
  { day: "T3", points: 135, delta: 15 },
  { day: "T4", points: 122, delta: -13 },
  { day: "T5", points: 155, delta: 33 },
  { day: "T6", points: 148, delta: -7 },
  { day: "T7", points: 175, delta: 27 },
  { day: "CN", points: 192, delta: 17 },
  { day: "T2", points: 185, delta: -7 },
  { day: "T3", points: 210, delta: 25 },
  { day: "T4", points: 198, delta: -12 },
  { day: "T5", points: 168, delta: -30 },
  { day: "T6", points: 178, delta: 10 },
  { day: "T7", points: 192, delta: 14 },
  { day: "CN", points: 180, delta: -12 },
]

export const mockWeather: Record<string, { temp: number; condition: string; icon: string; wind: number }> = {
  "1": { temp: 22, condition: "Nắng nhẹ", icon: "☀️", wind: 8 },
  "2": { temp: 26, condition: "Có mây", icon: "⛅", wind: 12 },
  "3": { temp: 18, condition: "Mưa nhẹ", icon: "🌦️", wind: 15 },
  "4": { temp: 24, condition: "Quang đãng", icon: "☀️", wind: 6 },
  "5": { temp: 16, condition: "Nhiều mây", icon: "☁️", wind: 18 },
}

export const mockMatchPredictors = [
  { name: "Trần Văn Phán", avatar: "TVP", pick: "home", betType: "ah", confidence: 5, streak: 4 },
  { name: "Nguyễn Thị Dự", avatar: "NTD", pick: "home", betType: "exact", confidence: 4, streak: 2 },
  { name: "Lê Minh Đoán", avatar: "LMD", pick: "home", betType: "ah", confidence: 5, streak: 1 },
  { name: "Phạm Quang Kèo", avatar: "PQK", pick: "away", betType: "1x2", confidence: 3, streak: 0 },
  { name: "Hoàng Tiến Sỹ", avatar: "HTS", pick: "home", betType: "ou", confidence: 4, streak: 0 },
]

export const mockGroupNews = [
  { id: "n1", title: "🏆 Champion tuần này", body: "Trần Văn Phán (Thần Phán Đêm Khuya) — 285 xu, 18/22 đúng. Lập hat-trick badge!", time: "1 giờ", featured: true },
  { id: "n2", title: "📊 Tổng kết vòng bảng A", body: "Cả hội đoán đúng 73% trận Brazil. Mexico bị undervalue.", time: "5 giờ" },
  { id: "n3", title: "🎉 Phạm Quang Kèo vừa gia nhập", body: "Thành viên thứ 24 của hội. Chào mừng tân binh!", time: "1 ngày" },
  { id: "n4", title: "⚠️ Lịch khóa kèo tuần tới", body: "5 trận sẽ khóa kèo trước 30 phút bóng lăn. Đoán sớm kẻo lỡ.", time: "2 ngày" },
]

export const mockLineups: Record<string, { home: string[]; away: string[] }> = {
  "1": {
    home: ["Alisson", "Danilo", "Marquinhos", "Silva", "Vinicius", "Casemiro", "Neymar", "Rodrygo", "Raphinha", "Richarlison", "Jesus"],
    away: ["Ochoa", "Sanchez", "Montes", "Moreno", "Vega", "Edson Alvarez", "Hector Herrera", "Chucky Lozano", "Pizarro", "Antuna", "Henry Martin"],
  },
}

export const mockNotifications = [
  { id: "1", type: "goal", title: "⚽ Argentina ghi bàn!", body: "Messi phút 54. Pick của bạn đang sống khỏe.", read: false, time: "2 phút trước" },
  { id: "2", type: "kickoff_soon", title: "⏰ Brazil đá trong 5 phút", body: "Bạn vẫn chưa đoán. Đoán đại đi, vũ trụ đôi khi cũng thương kẻ lười.", read: false, time: "5 phút trước" },
  { id: "3", type: "badge", title: "🏅 Badge mới: Mắt Thần Tỉ Số", body: "Bạn đã đoán đúng tỉ số chính xác 3 lần. Tự hào chưa?", read: true, time: "1 giờ trước" },
  { id: "4", type: "rank_change", title: "📈 Lên hạng 6!", body: "Bạn vừa vượt Vũ Đức Mơ. Anh ấy chưa biết đâu.", read: true, time: "2 giờ trước" },
]
