import { getCurrentUser } from "@/lib/auth"
import { getDefaultGroupId } from "@/lib/default-group"
import { groupsMenuHref } from "@/lib/groups-nav"
import { prisma } from "@/lib/db"
import { NavbarLinks } from "./navbar-links"

export async function BottomNav() {
  const user = await getCurrentUser()
  if (!user) return null

  const defaultGroupId = await getDefaultGroupId(user.id)

  const navItems = [
    { href: "/", label: "Trang chủ", icon: "Home" as const, exact: true },
    { href: "/matches", label: "Lịch trận", icon: "Calendar" as const },
    { href: groupsMenuHref(defaultGroupId), label: "Hội", icon: "Users" as const, matchPrefix: "/groups" },
    { href: "/history", label: "Lịch sử", icon: "History" as const },
  ]

  const unpickedCount = defaultGroupId ? await prisma.match.count({
    where: {
      status: "scheduled",
      kickoffAt: { gt: new Date() },
      OR: [{ ahLine: { not: null } }, { ouLine: { not: null } }],
      predictions: { none: { userId: user.id, groupId: defaultGroupId } },
    },
  }) : 0

  return <NavbarLinks items={navItems} mobile badges={{ "/matches": unpickedCount }} />
}
