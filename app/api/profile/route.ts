import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { displayName, statusText } = await req.json()

  const updates: Record<string, string | null> = {}

  if (displayName !== undefined) {
    const trimmed = typeof displayName === "string" ? displayName.trim() : ""
    updates.displayName = trimmed.length > 0 ? trimmed.slice(0, 40) : null
  }

  if (statusText !== undefined) {
    const trimmed = typeof statusText === "string" ? statusText.trim() : ""
    updates.statusText = trimmed.length > 0 ? trimmed.slice(0, 80) : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
    select: { displayName: true, statusText: true },
  })

  return NextResponse.json({ ok: true, ...updated })
}
