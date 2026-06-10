import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"

// GET — load settings by keys
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const keys = req.nextUrl.searchParams.get("keys")?.split(",") || []
  if (keys.length === 0) return NextResponse.json({ settings: {} })

  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } })
  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return NextResponse.json({ settings })
}

// PUT — save settings
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { settings } = await req.json() as { settings: Record<string, string> }
  if (!settings) return NextResponse.json({ error: "Missing settings" }, { status: 400 })

  for (const [key, value] of Object.entries(settings)) {
    if (value) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    } else {
      await prisma.setting.deleteMany({ where: { key } })
    }
  }

  return NextResponse.json({ ok: true })
}
