import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin"

// PATCH — update group (name, visibility, admin transfer)
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const body = await req.json()
  const { id, name, visibility, adminId } = body

  if (!id) return NextResponse.json({ error: "Group ID required" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (visibility !== undefined) data.visibility = visibility
  if (adminId !== undefined) data.adminId = adminId

  const group = await prisma.group.update({ where: { id }, data })
  return NextResponse.json({ group })
}

// DELETE — delete group
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "Group ID required" }, { status: 400 })

  // Delete related data first
  await prisma.activity.deleteMany({ where: { groupId: id } })
  await prisma.groupMember.deleteMany({ where: { groupId: id } })
  await prisma.group.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
