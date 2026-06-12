import { NextRequest } from "next/server"
import { requireAdmin } from "./admin"

function bearerToken(req: NextRequest) {
  const header = req.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null
  return header.slice("Bearer ".length).trim()
}

export async function requireCronOrAdmin(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET
  const providedSecret = bearerToken(req) ?? req.nextUrl.searchParams.get("secret")
  if (expectedSecret && providedSecret === expectedSecret) return true

  const admin = await requireAdmin()
  return !!admin
}
