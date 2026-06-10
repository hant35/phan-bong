import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"

// DELETE — kick member from group
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { groupId, userId } = await req.json()
  if (!groupId || !userId) return NextResponse.json({ error: "groupId and userId required" }, { status: 400 })

  await prisma.groupMember.deleteMany({ where: { groupId, userId } })
  return NextResponse.json({ ok: true })
}
