import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"
import { syncFootballData, syncOpenFootball, syncApiFootball, type SyncResult } from "@/lib/sync-sources"

async function getSavedKey(settingKey: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: settingKey } })
  return row?.value || null
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { sources, apiKeys } = await req.json() as {
    sources: string[]
    apiKeys?: Record<string, string>
  }
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return NextResponse.json({ error: "Chọn ít nhất một nguồn dữ liệu" }, { status: 400 })
  }

  const results: SyncResult[] = []

  for (const src of sources) {
    if (src === "football-data") {
      const key = apiKeys?.["football-data"] || await getSavedKey("apikey_football-data") || process.env.FOOTBALL_DATA_API_KEY
      if (!key) {
        results.push({ source: "Football-Data.org", updated: 0, errors: ["Chưa nhập API key"], details: [] })
        continue
      }
      results.push(await syncFootballData(key))
    }

    if (src === "openfootball") {
      results.push(await syncOpenFootball())
    }

    if (src === "api-football") {
      const key = apiKeys?.["api-football"] || await getSavedKey("apikey_api-football") || process.env.API_FOOTBALL_KEY
      if (!key) {
        results.push({ source: "API-Football", updated: 0, errors: ["Chưa nhập API key"], details: [] })
        continue
      }
      results.push(await syncApiFootball(key))
    }
  }

  return NextResponse.json({ results })
}
