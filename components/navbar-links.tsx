"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Trophy, Users, Home, History, User, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const iconMap = { Calendar, Trophy, Users, Home, History, User, Shield }

interface NavItem { href: string; label: string; icon: keyof typeof iconMap; exact?: boolean }

export function NavbarLinks({ items, mobile = false }: { items: NavItem[]; mobile?: boolean }) {
  const pathname = usePathname()

  if (mobile) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 flex pb-safe"
        style={{ background: "rgba(15,17,23,0.95)", backdropFilter: "blur(20px)" }}>
        {items.map(({ href, label, icon, exact }) => {
          const Icon = iconMap[icon]
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                active ? "text-[#00e676]" : "text-white/30"
              )}>
              <Icon size={18} />{label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="hidden md:flex items-center gap-1">
      {items.map(({ href, label, icon, exact }) => {
        const Icon = iconMap[icon]
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link key={href} href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
              active ? "text-white bg-white/10" : "text-white/50 hover:text-white hover:bg-white/5"
            )}>
            <Icon size={15} />{label}
          </Link>
        )
      })}
    </nav>
  )
}
