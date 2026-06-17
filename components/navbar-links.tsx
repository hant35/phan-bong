"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Trophy, Users, Home, History, User, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const iconMap = { Calendar, Trophy, Users, Home, History, User, Shield }

interface NavItem { href: string; label: string; icon: keyof typeof iconMap; exact?: boolean; matchPrefix?: string }

export function NavbarLinks({
  items, mobile = false, badges = {},
}: {
  items: NavItem[]; mobile?: boolean; badges?: Record<string, number>
}) {
  const pathname = usePathname()

  if (mobile) {
    return (
      <nav className="md:hidden border-t border-white/5 flex pb-safe flex-shrink-0"
        style={{ background: "#0f1117" }}>
        {items.map(({ href, label, icon, exact, matchPrefix }) => {
          const Icon = iconMap[icon]
          const active = matchPrefix
            ? pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`)
            : exact ? pathname === href : pathname.startsWith(href)
          const badge = badges[href]
          return (
            <Link key={href} href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors relative",
                active ? "text-[#00e676]" : "text-white/30"
              )}>
              <span className="relative">
                <Icon size={18} />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[9px] font-black"
                    style={{ background: "#ff5252", color: "white" }}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="hidden md:flex items-center gap-1">
      {items.map(({ href, label, icon, exact, matchPrefix }) => {
        const Icon = iconMap[icon]
        const active = matchPrefix
          ? pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`)
          : exact ? pathname === href : pathname.startsWith(href)
        const badge = badges[href]
        return (
          <Link key={href} href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all relative",
              active ? "text-white bg-white/10" : "text-white/50 hover:text-white hover:bg-white/5"
            )}>
            <span className="relative">
              <Icon size={15} />
              {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[9px] font-black"
                  style={{ background: "#ff5252", color: "white" }}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
