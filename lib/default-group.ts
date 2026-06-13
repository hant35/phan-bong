import { prisma } from "@/lib/db"

/** Hội mặc định của user — fallback hội tham gia sớm nhất. */
export async function getDefaultGroupId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultGroupId: true },
  })

  if (user?.defaultGroupId) {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: user.defaultGroupId } },
    })
    if (member) return user.defaultGroupId
  }

  const first = await prisma.groupMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: { groupId: true },
  })
  return first?.groupId ?? null
}
