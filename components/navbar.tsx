import Link from "next/link"
import { Bell, Trophy, Users, Calendar, User, Home, History, Shield } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NavbarLinks } from "./navbar-links"

const navItems = [
  { href: "/", label: "Trang chủ", icon: "Home" as const, exact: true },
  { href: "/matches", label: "Lịch trận", icon: "Calendar" as const },
  { href: "/leaderboard", label: "Bảng vàng", icon: "Trophy" as const },
  { href: "/groups", label: "Hội", icon: "Users" as const },
  { href: "/history", label: "Lịch sử", icon: "History" as const },
  { href: "/profile", label: "Hồ sơ", icon: "User" as const },
]

export async function Navbar() {
  const user = await getCurrentUser()
  if (!user) return null

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  })

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/5"
        style={{ background: "rgba(15,17,23,0.85)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
              style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
              ⚽
            </div>
            <span className="font-black text-lg tracking-tight" style={{ color: "#00e676" }}>
              Phán Bóng
            </span>
          </Link>

          <NavbarLinks items={navItems} />

          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              <Link href="/admin" className="relative p-2 rounded-xl hover:bg-white/5 transition-colors"
                title="Admin Panel">
                <Shield size={18} className="text-red-400" />
              </Link>
            )}
            <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
              <Bell size={18} className="text-white/60" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-black"
                  style={{ background: "#00e676", color: "#0f1117" }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/profile" className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }}>
              {user.avatar ?? "BN"}
            </Link>
          </div>
        </div>
      </header>
      <NavbarLinks items={navItems} mobile />
    </>
  )
}
