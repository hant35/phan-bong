import { prisma } from "@/lib/db"
import { GRADE_DELAY_MINUTES } from "@/lib/grading"

// ══════════════════════════════════════════════════════════════
// Data source definitions
// ══════════════════════════════════════════════════════════════

export interface DataSource {
  id: string
  name: string
  description: string
  features: string[] // what this source provides
  free: boolean
  requiresKey: boolean
  keyEnvVar?: string
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: "football-data",
    name: "Football-Data.org",
    description: "Tỉ số trực tiếp, lịch thi đấu, trạng thái trận đấu. Miễn phí 10 req/phút.",
    features: ["scores", "status", "schedule"],
    free: true,
    requiresKey: true,
    keyEnvVar: "FOOTBALL_DATA_API_KEY",
  },
  {
    id: "openfootball",
    name: "OpenFootball (GitHub)",
    description: "Lịch thi đấu & tỉ số từ GitHub JSON. Hoàn toàn miễn phí, không cần API key.",
    features: ["scores", "schedule"],
    free: true,
    requiresKey: false,
  },
  {
    id: "api-football",
    name: "API-Football",
    description: "Tỉ số live (15s), kèo pre-match. Miễn phí 100 req/ngày.",
    features: ["scores", "status", "odds", "schedule"],
    free: true,
    requiresKey: true,
    keyEnvVar: "API_FOOTBALL_KEY",
  },
]

// ══════════════════════════════════════════════════════════════
// Sync result type
// ══════════════════════════════════════════════════════════════

export interface SyncResult {
  source: string
  updated: number
  errors: string[]
  details: string[]
  request?: {
    method: string
    url: string
    headers: Record<string, string>
  }
  response?: {
    status: number
    statusText: string
    matchesFromApi: number
    matchesInDb: number
    sampleData?: unknown
  }
}

// ══════════════════════════════════════════════════════════════
// Matching helper — find local match by team names + date
// ══════════════════════════════════════════════════════════════

function normalizeTeam(name: string): string {
  // Map common English → Vietnamese team names
  const map: Record<string, string> = {
    "mexico": "mexico",
    "united states": "mỹ", "usa": "mỹ",
    "canada": "canada",
    "brazil": "brazil",
    "argentina": "argentina",
    "germany": "đức",
    "france": "pháp",
    "spain": "tây ban nha",
    "england": "anh",
    "portugal": "bồ đào nha",
    "netherlands": "hà lan",
    "italy": "ý",
    "belgium": "bỉ",
    "croatia": "croatia",
    "uruguay": "uruguay",
    "colombia": "colombia",
    "japan": "nhật bản",
    "south korea": "hàn quốc", "korea republic": "hàn quốc",
    "australia": "úc",
    "saudi arabia": "ả rập xê út",
    "iran": "iran",
    "qatar": "qatar",
    "morocco": "morocco",
    "senegal": "senegal",
    "cameroon": "cameroon",
    "ghana": "ghana",
    "nigeria": "nigeria",
    "egypt": "ai cập",
    "tunisia": "tunisia",
    "ecuador": "ecuador",
    "paraguay": "paraguay",
    "chile": "chile",
    "peru": "peru",
    "bolivia": "bolivia",
    "venezuela": "venezuela",
    "panama": "panama",
    "costa rica": "costa rica",
    "jamaica": "jamaica",
    "honduras": "honduras",
    "trinidad and tobago": "trinidad & tobago",
    "serbia": "serbia",
    "switzerland": "thụy sĩ",
    "denmark": "đan mạch",
    "sweden": "thụy điển",
    "poland": "ba lan",
    "czech republic": "czech", "czechia": "czech",
    "austria": "áo",
    "scotland": "scotland",
    "wales": "xứ wales",
    "ukraine": "ukraine",
    "turkey": "thổ nhĩ kỳ", "türkiye": "thổ nhĩ kỳ",
    "russia": "nga",
    "republic of ireland": "ireland", "ireland": "ireland",
    "north macedonia": "bắc macedonia",
    "bosnia and herzegovina": "bosnia",
    "slovenia": "slovenia",
    "slovakia": "slovakia",
    "albania": "albania",
    "indonesia": "indonesia",
    "china pr": "trung quốc", "china": "trung quốc",
    "new zealand": "new zealand",
    "south africa": "nam phi",
    "bahrain": "bahrain",
    "uzbekistan": "uzbekistan",
  }
  const lower = name.toLowerCase().trim()
  return map[lower] || lower
}

// Reverse map: English name → { viName, flag, color }
const TEAM_META: Record<string, { vi: string; flag: string; color: string }> = {
  "mexico": { vi: "Mexico", flag: "mx", color: "#006847" },
  "south africa": { vi: "Nam Phi", flag: "za", color: "#FFB81C" },
  "korea republic": { vi: "Hàn Quốc", flag: "kr", color: "#C60C30" },
  "south korea": { vi: "Hàn Quốc", flag: "kr", color: "#C60C30" },
  "czechia": { vi: "Czechia", flag: "cz", color: "#11457E" },
  "canada": { vi: "Canada", flag: "ca", color: "#FF0000" },
  "bosnia and herzegovina": { vi: "Bosnia", flag: "ba", color: "#002395" },
  "bosnia-herzegovina": { vi: "Bosnia", flag: "ba", color: "#002395" },
  "qatar": { vi: "Qatar", flag: "qa", color: "#8A1538" },
  "switzerland": { vi: "Thụy Sĩ", flag: "ch", color: "#FF0000" },
  "brazil": { vi: "Brazil", flag: "br", color: "#009c3b" },
  "morocco": { vi: "Morocco", flag: "ma", color: "#C1272D" },
  "haiti": { vi: "Haiti", flag: "ht", color: "#00209F" },
  "scotland": { vi: "Scotland", flag: "gb-sct", color: "#003078" },
  "united states": { vi: "Mỹ", flag: "us", color: "#002868" },
  "paraguay": { vi: "Paraguay", flag: "py", color: "#DA121A" },
  "australia": { vi: "Úc", flag: "au", color: "#FFCD00" },
  "türkiye": { vi: "Thổ Nhĩ Kỳ", flag: "tr", color: "#E30A17" },
  "turkey": { vi: "Thổ Nhĩ Kỳ", flag: "tr", color: "#E30A17" },
  "germany": { vi: "Đức", flag: "de", color: "#000000" },
  "curaçao": { vi: "Curaçao", flag: "cw", color: "#002B7F" },
  "ivory coast": { vi: "Bờ Biển Ngà", flag: "ci", color: "#F77F00" },
  "côte d'ivoire": { vi: "Bờ Biển Ngà", flag: "ci", color: "#F77F00" },
  "ecuador": { vi: "Ecuador", flag: "ec", color: "#FFD100" },
  "netherlands": { vi: "Hà Lan", flag: "nl", color: "#FF6600" },
  "japan": { vi: "Nhật Bản", flag: "jp", color: "#000080" },
  "sweden": { vi: "Thụy Điển", flag: "se", color: "#006AA7" },
  "tunisia": { vi: "Tunisia", flag: "tn", color: "#E70013" },
  "belgium": { vi: "Bỉ", flag: "be", color: "#ED2939" },
  "egypt": { vi: "Ai Cập", flag: "eg", color: "#CE1126" },
  "iran": { vi: "Iran", flag: "ir", color: "#239F40" },
  "new zealand": { vi: "New Zealand", flag: "nz", color: "#000000" },
  "spain": { vi: "Tây Ban Nha", flag: "es", color: "#AA151B" },
  "cape verde": { vi: "Cape Verde", flag: "cv", color: "#003893" },
  "cabo verde": { vi: "Cape Verde", flag: "cv", color: "#003893" },
  "cape verde islands": { vi: "Cape Verde", flag: "cv", color: "#003893" },
  "saudi arabia": { vi: "Ả Rập Xê Út", flag: "sa", color: "#006C35" },
  "uruguay": { vi: "Uruguay", flag: "uy", color: "#5CBFEB" },
  "france": { vi: "Pháp", flag: "fr", color: "#002395" },
  "senegal": { vi: "Senegal", flag: "sn", color: "#00853F" },
  "iraq": { vi: "Iraq", flag: "iq", color: "#007A3D" },
  "norway": { vi: "Na Uy", flag: "no", color: "#EF2B2D" },
  "argentina": { vi: "Argentina", flag: "ar", color: "#74ACDF" },
  "algeria": { vi: "Algeria", flag: "dz", color: "#006233" },
  "austria": { vi: "Áo", flag: "at", color: "#ED2939" },
  "jordan": { vi: "Jordan", flag: "jo", color: "#007A3D" },
  "portugal": { vi: "Bồ Đào Nha", flag: "pt", color: "#006600" },
  "dr congo": { vi: "CHDC Congo", flag: "cd", color: "#007FFF" },
  "congo dr": { vi: "CHDC Congo", flag: "cd", color: "#007FFF" },
  "uzbekistan": { vi: "Uzbekistan", flag: "uz", color: "#1EB53A" },
  "colombia": { vi: "Colombia", flag: "co", color: "#FCD116" },
  "england": { vi: "Anh", flag: "gb-eng", color: "#CF081F" },
  "croatia": { vi: "Croatia", flag: "hr", color: "#FF0000" },
  "ghana": { vi: "Ghana", flag: "gh", color: "#006B3F" },
  "panama": { vi: "Panama", flag: "pa", color: "#DA121A" },
}

function getTeamMeta(englishName: string): { vi: string; flag: string; color: string } | null {
  return TEAM_META[englishName.toLowerCase().trim()] || null
}

// Strict matching: compare Vietnamese name from API team with local DB team
function findLocalMatch<T extends { id: string; externalId: string | null; homeTeam: string; awayTeam: string; kickoffAt: Date }>(
  localMatches: T[],
  extId: string | number | null,
  homeEnglish: string,
  awayEnglish: string,
  extDate?: Date,
): T | undefined {
  // 1. Match by externalId (most reliable)
  if (extId != null) {
    const byExtId = localMatches.find(m => m.externalId === String(extId))
    if (byExtId) return byExtId
  }

  // 2. Get Vietnamese names via TEAM_META for exact matching
  const homeMeta = getTeamMeta(homeEnglish)
  const awayMeta = getTeamMeta(awayEnglish)

  if (homeMeta && awayMeta) {
    // Exact Vietnamese name match
    const exact = localMatches.find(m => {
      const homeOk = m.homeTeam === homeMeta.vi
      const awayOk = m.awayTeam === awayMeta.vi
      if (!homeOk || !awayOk) return false
      if (extDate) {
        return Math.abs(new Date(m.kickoffAt).getTime() - extDate.getTime()) < 48 * 3600 * 1000
      }
      return true
    })
    if (exact) return exact
  }

  // 3. Fallback: normalize + exact lowercase match (not includes!)
  const homeNorm = normalizeTeam(homeEnglish)
  const awayNorm = normalizeTeam(awayEnglish)
  return localMatches.find(m => {
    const homeOk = m.homeTeam.toLowerCase() === homeNorm
    const awayOk = m.awayTeam.toLowerCase() === awayNorm
    if (!homeOk || !awayOk) return false
    if (extDate) {
      return Math.abs(new Date(m.kickoffAt).getTime() - extDate.getTime()) < 48 * 3600 * 1000
    }
    return true
  })
}

// ══════════════════════════════════════════════════════════════
// Source 1: football-data.org
// ══════════════════════════════════════════════════════════════

const FD_STATUS_MAP: Record<string, string> = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  IN_PLAY: "live",
  PAUSED: "live",
  FINISHED: "finished",
  SUSPENDED: "live",
  POSTPONED: "scheduled",
  CANCELLED: "finished",
  AWARDED: "finished",
}

export async function syncFootballData(apiKey: string): Promise<SyncResult> {
  // Không giới hạn limit: WC 2026 có 104 trận, limit=100 sẽ cắt mất các trận cuối
  // giải (bán kết, tranh hạng ba, chung kết) khiến chúng không bao giờ được sync.
  const url = "https://api.football-data.org/v4/competitions/WC/matches"
  const headers = { "X-Auth-Token": apiKey }
  const result: SyncResult = {
    source: "Football-Data.org", updated: 0, errors: [], details: [],
    request: { method: "GET", url, headers: { "X-Auth-Token": apiKey.slice(0, 6) + "••••••" } },
  }

  try {
    const res = await fetch(url, { headers })
    if (!res.ok) {
      result.response = { status: res.status, statusText: res.statusText, matchesFromApi: 0, matchesInDb: 0 }
      result.errors.push(`API trả về ${res.status}: ${res.statusText}`)
      return result
    }
    const data = await res.json()
    const matches = data.matches || []
    const localMatches = await prisma.match.findMany()

    result.response = {
      status: res.status, statusText: res.statusText,
      matchesFromApi: matches.length, matchesInDb: localMatches.length,
      sampleData: matches.length > 0 ? {
        id: matches[0].id,
        homeTeam: matches[0].homeTeam?.name,
        awayTeam: matches[0].awayTeam?.name,
        status: matches[0].status,
        score: matches[0].score,
        utcDate: matches[0].utcDate,
      } : null,
    }

    for (const ext of matches) {
      const homeName = ext.homeTeam?.name || ext.homeTeam?.shortName || ""
      const awayName = ext.awayTeam?.name || ext.awayTeam?.shortName || ""
      const extDate = new Date(ext.utcDate)

      const local = findLocalMatch(localMatches, ext.id, homeName, awayName, extDate)

      if (!local) {
        // Match not found locally — create it
        const homeMeta = getTeamMeta(homeName)
        const awayMeta = getTeamMeta(awayName)

        if (homeMeta && awayMeta) {
          const stage = ext.stage === "GROUP_STAGE" ? "Vòng bảng"
            : ext.stage === "LAST_32" ? "Vòng 32"
            : ext.stage === "LAST_16" ? "Vòng 16"
            : ext.stage === "QUARTER_FINALS" ? "Tứ kết"
            : ext.stage === "SEMI_FINALS" ? "Bán kết"
            : ext.stage === "FINAL" ? "Chung kết"
            : ext.stage || "Vòng bảng"

          const created = await prisma.match.create({
            data: {
              externalId: String(ext.id),
              homeTeam: homeMeta.vi,
              awayTeam: awayMeta.vi,
              homeFlag: homeMeta.flag,
              awayFlag: awayMeta.flag,
              homeColor: homeMeta.color,
              awayColor: awayMeta.color,
              kickoffAt: extDate,
              stage,
              venue: ext.venue || null,
              status: FD_STATUS_MAP[ext.status] || "scheduled",
              scoreHome: (ext.score?.duration !== "REGULAR" && ext.score?.regularTime ? ext.score.regularTime : ext.score?.fullTime)?.home ?? null,
              scoreAway: (ext.score?.duration !== "REGULAR" && ext.score?.regularTime ? ext.score.regularTime : ext.score?.fullTime)?.away ?? null,
            },
          })
          // Add to localMatches to prevent duplicates in subsequent iterations
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          localMatches.push(created as any)
          result.updated++
          result.details.push(`✚ Tạo mới: ${homeMeta.vi} vs ${awayMeta.vi}`)
        } else {
          result.details.push(`⚠ Không nhận diện đội: ${homeName} vs ${awayName}`)
        }
        continue
      }

      const updates: Record<string, unknown> = {}
      if (!local.externalId) updates.externalId = String(ext.id)

      const newStatus = FD_STATUS_MAP[ext.status] || local.status
      if (newStatus !== local.status) updates.status = newStatus
      // Đánh dấu mốc kết thúc — KHÔNG chấm ngay, để cron chấm sau GRADE_DELAY_MINUTES
      if (newStatus === "finished" && local.status !== "finished") updates.finishedAt = new Date()

      // Luôn lưu tỉ số 90 phút chính thức — regularTime có giá trị khi trận có hiệp phụ/pen
      const ftScore = ext.score?.duration !== "REGULAR" && ext.score?.regularTime
        ? ext.score.regularTime
        : ext.score?.fullTime
      if (ftScore?.home != null && ftScore.home !== local.scoreHome) {
        updates.scoreHome = ftScore.home
      }
      if (ftScore?.away != null && ftScore.away !== local.scoreAway) {
        updates.scoreAway = ftScore.away
      }
      if (ext.minute != null && ext.minute !== local.minute) {
        updates.minute = ext.minute
      }

      if (Object.keys(updates).length > 0) {
        await prisma.match.update({ where: { id: local.id }, data: updates })
        result.updated++
        result.details.push(`${local.homeTeam} vs ${local.awayTeam}: ${Object.keys(updates).join(", ")}`)
        if (updates.finishedAt) result.details.push(`🏁 ${local.homeTeam} vs ${local.awayTeam} kết thúc — sẽ chấm sau ${GRADE_DELAY_MINUTES} phút`)
      }
    }
  } catch (e: unknown) {
    result.errors.push(`Lỗi: ${e instanceof Error ? e.message : String(e)}`)
  }

  return result
}

// ══════════════════════════════════════════════════════════════
// Source 2: OpenFootball (GitHub JSON)
// ══════════════════════════════════════════════════════════════

export async function syncOpenFootball(): Promise<SyncResult> {
  const url = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
  const result: SyncResult = {
    source: "OpenFootball (GitHub)", updated: 0, errors: [], details: [],
    request: { method: "GET", url, headers: {} },
  }

  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) {
      result.response = { status: res.status, statusText: res.statusText, matchesFromApi: 0, matchesInDb: 0 }
      result.errors.push(`GitHub trả về ${res.status}`)
      return result
    }
    const data = await res.json()
    const localMatches = await prisma.match.findMany()
    const allExtMatches = Array.isArray(data.matches)
      ? data.matches
      : (data.rounds || []).flatMap((round: { matches?: unknown[] }) => round.matches || [])

    result.response = {
      status: res.status, statusText: res.statusText,
      matchesFromApi: allExtMatches.length, matchesInDb: localMatches.length,
      sampleData: allExtMatches.length > 0 ? allExtMatches[0] : null,
    }

    for (const ext of allExtMatches) {
      const homeName = (ext as { team1?: string }).team1 || ""
      const awayName = (ext as { team2?: string }).team2 || ""
      const extData = ext as { date?: string; time?: string; group?: string; ground?: string; score?: { ft?: [number, number] } }
      const extDate = extData.date ? new Date(extData.date) : undefined
      // CHỈ lấy tỉ số 90 phút chính thức (score.ft) — bỏ qua score.et (hiệp phụ) và score.p (penalty)
      const ftHome = extData.score?.ft?.[0]
      const ftAway = extData.score?.ft?.[1]

      const local = findLocalMatch(localMatches, null, homeName, awayName, extDate)

      if (!local) {
        const homeMeta = getTeamMeta(homeName)
        const awayMeta = getTeamMeta(awayName)

        if (homeMeta && awayMeta && extData.date) {
          const kickoffAt = extData.time
            ? new Date(`${extData.date}T${extData.time.replace(/\s*UTC.*/, "")}:00Z`)
            : new Date(extData.date)

          const created = await prisma.match.create({
            data: {
              homeTeam: homeMeta.vi,
              awayTeam: awayMeta.vi,
              homeFlag: homeMeta.flag,
              awayFlag: awayMeta.flag,
              homeColor: homeMeta.color,
              awayColor: awayMeta.color,
              kickoffAt,
              stage: extData.group || "Vòng bảng",
              venue: extData.ground || null,
              status: ftHome != null ? "finished" : "scheduled",
              scoreHome: ftHome ?? null,
              scoreAway: ftAway ?? null,
            },
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          localMatches.push(created as any)
          result.updated++
          result.details.push(`✚ Tạo mới: ${homeMeta.vi} vs ${awayMeta.vi}`)
        }
        continue
      }

      const updates: Record<string, unknown> = {}

      if (ftHome != null && ftHome !== local.scoreHome) {
        updates.scoreHome = ftHome
      }
      if (ftAway != null && ftAway !== local.scoreAway) {
        updates.scoreAway = ftAway
      }
      if (ftHome != null && ftAway != null && local.status !== "finished") {
        updates.status = "finished"
        updates.finishedAt = new Date()
      }

      if (Object.keys(updates).length > 0) {
        await prisma.match.update({ where: { id: local.id }, data: updates })
        result.updated++
        result.details.push(`${local.homeTeam} vs ${local.awayTeam}: ${Object.keys(updates).join(", ")}`)
        if (updates.finishedAt) result.details.push(`🏁 ${local.homeTeam} vs ${local.awayTeam} kết thúc — sẽ chấm sau ${GRADE_DELAY_MINUTES} phút`)
      }
    }
  } catch (e: unknown) {
    result.errors.push(`Lỗi: ${e instanceof Error ? e.message : String(e)}`)
  }

  return result
}

// ══════════════════════════════════════════════════════════════
// Source 3: API-Football (api-sports.io)
// ══════════════════════════════════════════════════════════════

export async function syncApiFootball(apiKey: string): Promise<SyncResult> {
  const url = "https://v3.football.api-sports.io/fixtures?league=1&season=2026"
  const result: SyncResult = {
    source: "API-Football", updated: 0, errors: [], details: [],
    request: { method: "GET", url, headers: { "x-apisports-key": apiKey.slice(0, 6) + "••••••" } },
  }

  try {
    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } })
    if (!res.ok) {
      result.response = { status: res.status, statusText: res.statusText, matchesFromApi: 0, matchesInDb: 0 }
      result.errors.push(`API trả về ${res.status}: ${res.statusText}`)
      return result
    }
    const data = await res.json()
    const fixtures = data.response || []
    const localMatches = await prisma.match.findMany()

    result.response = {
      status: res.status, statusText: res.statusText,
      matchesFromApi: fixtures.length, matchesInDb: localMatches.length,
      sampleData: fixtures.length > 0 ? {
        fixture: { id: fixtures[0].fixture?.id, status: fixtures[0].fixture?.status },
        teams: fixtures[0].teams,
        goals: fixtures[0].goals,
      } : null,
    }

    for (const fix of fixtures) {
      const homeName = fix.teams?.home?.name || ""
      const awayName = fix.teams?.away?.name || ""
      const extDate = new Date(fix.fixture?.date || "")

      const local = findLocalMatch(localMatches, null, homeName, awayName, extDate)

      if (!local) {
        const homeMeta = getTeamMeta(homeName)
        const awayMeta = getTeamMeta(awayName)

        if (homeMeta && awayMeta) {
          const statusShort = fix.fixture?.status?.short || ""
          const status = ["1H", "2H", "ET", "P", "BT", "LIVE"].includes(statusShort) ? "live"
            : ["FT", "AET", "PEN"].includes(statusShort) ? "finished" : "scheduled"

          const created = await prisma.match.create({
            data: {
              homeTeam: homeMeta.vi,
              awayTeam: awayMeta.vi,
              homeFlag: homeMeta.flag,
              awayFlag: awayMeta.flag,
              homeColor: homeMeta.color,
              awayColor: awayMeta.color,
              kickoffAt: extDate,
              stage: "Vòng bảng",
              venue: fix.fixture?.venue?.name || null,
              status,
              scoreHome: fix.score?.fulltime?.home ?? fix.goals?.home ?? null,
              scoreAway: fix.score?.fulltime?.away ?? fix.goals?.away ?? null,
            },
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          localMatches.push(created as any)
          result.updated++
          result.details.push(`✚ Tạo mới: ${homeMeta.vi} vs ${awayMeta.vi}`)
        }
        continue
      }

      const updates: Record<string, unknown> = {}

      // Status mapping
      const statusShort = fix.fixture?.status?.short || ""
      if (["1H", "2H", "ET", "P", "BT", "LIVE"].includes(statusShort)) {
        if (local.status !== "live") updates.status = "live"
      } else if (["FT", "AET", "PEN"].includes(statusShort)) {
        if (local.status !== "finished") { updates.status = "finished"; updates.finishedAt = new Date() }
      }

      // Tỉ số 90 phút: dùng score.fulltime (90p), fallback fix.goals khi đang live
      const apiScore90 = fix.score?.fulltime
      const scoreSource = apiScore90?.home != null ? apiScore90 : fix.goals
      if (scoreSource?.home != null && scoreSource.home !== local.scoreHome) {
        updates.scoreHome = scoreSource.home
      }
      if (scoreSource?.away != null && scoreSource.away !== local.scoreAway) {
        updates.scoreAway = scoreSource.away
      }
      // Minute
      if (fix.fixture?.status?.elapsed != null && fix.fixture.status.elapsed !== local.minute) {
        updates.minute = fix.fixture.status.elapsed
      }

      if (Object.keys(updates).length > 0) {
        await prisma.match.update({ where: { id: local.id }, data: updates })
        result.updated++
        result.details.push(`${local.homeTeam} vs ${local.awayTeam}: ${Object.keys(updates).join(", ")}`)
        if (updates.finishedAt) result.details.push(`🏁 ${local.homeTeam} vs ${local.awayTeam} kết thúc — sẽ chấm sau ${GRADE_DELAY_MINUTES} phút`)
      }
    }

    // ── Odds sync (separate call) ──
    const oddsRes = await fetch(
      "https://v3.football.api-sports.io/odds?league=1&season=2026",
      { headers: { "x-apisports-key": apiKey } }
    )
    if (oddsRes.ok) {
      const oddsData = await oddsRes.json()
      const oddsList = oddsData.response || []

      for (const item of oddsList) {
        const fixtureId = item.fixture?.id
        // Find the fixture from our earlier data
        const fix = fixtures.find((f: { fixture?: { id?: number } }) => f.fixture?.id === fixtureId)
        if (!fix) continue

        const homeNorm = normalizeTeam(fix.teams?.home?.name || "")
        const awayNorm = normalizeTeam(fix.teams?.away?.name || "")

        const local = localMatches.find(m => {
          const homeMatch = m.homeTeam.toLowerCase().includes(homeNorm) || homeNorm.includes(m.homeTeam.toLowerCase())
          const awayMatch = m.awayTeam.toLowerCase().includes(awayNorm) || awayNorm.includes(m.awayTeam.toLowerCase())
          return homeMatch && awayMatch
        })

        if (!local) continue

        const bookmakers = item.bookmakers || []
        const bk = bookmakers[0] // Use first bookmaker
        if (!bk) continue

        const updates: Record<string, unknown> = {}
        for (const bet of bk.bets || []) {
          // Asian Handicap
          if (bet.name === "Asian Handicap" && local.ahLine == null) {
            const val = bet.values?.[0]
            if (val?.value) updates.ahLine = parseFloat(val.value)
          }
          // Over/Under
          if ((bet.name === "Goals Over/Under" || bet.name === "Over/Under") && local.ouLine == null) {
            const val = bet.values?.[0]
            if (val?.value) {
              const parsed = parseFloat(String(val.value).replace(/[^0-9.-]/g, ""))
              if (!isNaN(parsed)) updates.ouLine = parsed
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          await prisma.match.update({ where: { id: local.id }, data: updates })
          result.updated++
          result.details.push(`${local.homeTeam} vs ${local.awayTeam} (odds): ${Object.keys(updates).join(", ")}`)
        }
      }
    }
  } catch (e: unknown) {
    result.errors.push(`Lỗi: ${e instanceof Error ? e.message : String(e)}`)
  }

  return result
}
