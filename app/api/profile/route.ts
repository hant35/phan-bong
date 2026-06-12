import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 })

  const { displayName, statusText, defaultGroupId, quietHoursEnabled } = await req.json()

  const updates: {
    displayName?: string | null
    statusText?: string | null
    defaultGroupId?: string | null
    quietHoursEnabled?: boolean
  } = {}

  if (displayName !== undefined) {
    const trimmed = typeof displayName === "string" ? displayName.trim() : ""
    updates.displayName = trimmed.length > 0 ? trimmed.slice(0, 40) : null
  }

  if (statusText !== undefined) {
    const trimmed = typeof statusText === "string" ? statusText.trim() : ""
    updates.statusText = trimmed.length > 0 ? trimmed.slice(0, 80) : null
  }

  if (defaultGroupId !== undefined) {
    if (defaultGroupId === null || defaultGroupId === "") {
      updates.defaultGroupId = null
    } else if (typeof defaultGroupId === "string") {
      const member = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: defaultGroupId } },
      })
      if (!member) {
        return NextResponse.json({ error: "Bạn không phải thành viên hội này" }, { status: 400 })
      }
      updates.defaultGroupId = defaultGroupId
    }
  }

  if (quietHoursEnabled !== undefined) {
    updates.quietHoursEnabled = quietHoursEnabled === true
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
    select: { displayName: true, statusText: true, defaultGroupId: true, quietHoursEnabled: true },
  })

  return NextResponse.json({ ok: true, ...updated })
}
