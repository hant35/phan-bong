import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { ArrowRight, Zap, Flame, TrendingUp, Clock, Users, Trophy, ChevronRight, Activity, Target } from "lucide-react"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { flagUrl, formatCountdown, formatDateTimeParts, timeAgo } from "@/lib/format"
import { LiveMatchBar } from "@/components/live-match-card"

const activityColors: Record<string, string> = {
  pick: "#ec4899", win: "#00e676", join: "#00bcd4", badge: "#ffd700",
  loss: "#ff5252", comment: "#7c3aed", rank: "#00e676",
}

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: { predictions: { where: { userId: user.id } } },
  })
  const liveMatches = matches.filter(m => m.status === "live")
  const nextMatch = matches.find(m => m.status === "scheduled" && m.predictions.length === 0) ?? matches[0]

  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { user: { select: { name: true, avatar: true } } },
  })

  const topUsers = await prisma.user.findMany({
    orderBy: { totalPoints: "desc" },
    take: 3,
    select: { name: true, totalPoints: true, avatar: true },
  })

  const myGroups = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: { group: { include: { _count: { select: { members: true } } } } },
  })

  // Build my groups with ranks
  const myGroupsWithRank = await Promise.all(myGroups.map(async m => {
    const all = await prisma.groupMember.findMany({ where: { groupId: m.groupId }, orderBy: { points: "desc" } })
    return {
      id: m.group.id, name: m.group.name,
      memberCount: m.group._count.members,
      myRank: all.findIndex(x => x.userId === user.id) + 1,
    }
  }))

  // Stats this week
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const myWeekPicks = await prisma.prediction.count({ where: { userId: user.id, createdAt: { gte: sevenDaysAgo } } })
  const myWeekWins = await prisma.prediction.count({ where: { userId: user.id, createdAt: { gte: sevenDaysAgo }, result: "win" } })
  const myWeekTotal = await prisma.prediction.count({ where: { userId: user.id, result: { in: ["win", "loss"] } } })
  const myWeekCorrect = await prisma.prediction.count({ where: { userId: user.id, result: "win" } })
  const winRate = myWeekTotal > 0 ? Math.round(myWeekCorrect / myWeekTotal * 100) : 0

  const hm = { flag: nextMatch.homeFlag, color: nextMatch.homeColor }
  const am = { flag: nextMatch.awayFlag, color: nextMatch.awayColor }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Chào, {user.name} 👋</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Hôm nay có {matches.filter(m => m.status === "scheduled").length} trận chờ bạn phán
          </p>
        </div>
        <Link href="/profile" className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black"
          style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }}>
          {user.avatar ?? "BN"}
        </Link>
      </div>

      <Link href={`/matches/${nextMatch.id}`}>
        <div className="relative rounded-3xl overflow-hidden hover:scale-[1.005] transition-transform" style={{
          background: `linear-gradient(135deg, ${hm.color ?? "#1a1d2e"}40 0%, #0f1117 50%, ${am.color ?? "#1a1d2e"}40 100%)`,
          border: "1px solid rgba(255,255,255,0.08)"
        }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #00e676 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} style={{ color: "#00e676" }} />
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#00e676" }}>
                Trận tiếp theo · Bạn chưa đoán
              </span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative w-14 h-10 rounded-xl overflow-hidden ring-2 ring-white/10 shadow-lg flex-shrink-0">
                  <Image src={flagUrl(hm.flag)} alt={nextMatch.homeTeam} fill className="object-cover" unoptimized />
                </div>
                <div>
                  <div className="font-black text-white text-base">{nextMatch.homeTeam}</div>
                  <div className="text-[10px] text-white/30">Chủ nhà</div>
                </div>
              </div>
              <div className="text-center px-3"><div className="text-white/40 font-black text-xl">VS</div></div>
              <div className="flex items-center gap-3 flex-1 justify-end">
                <div className="text-right">
                  <div className="font-black text-white text-base">{nextMatch.awayTeam}</div>
                  <div className="text-[10px] text-white/30">Khách</div>
                </div>
                <div className="relative w-14 h-10 rounded-xl overflow-hidden ring-2 ring-white/10 shadow-lg flex-shrink-0">
                  <Image src={flagUrl(am.flag)} alt={nextMatch.awayTeam} fill className="object-cover" unoptimized />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-orange-400" />
                <span className="font-black text-orange-400 text-sm">{formatCountdown(nextMatch.kickoffAt)}</span>
                <span className="text-xs text-white/30">· {formatDateTimeParts(nextMatch.kickoffAt).time} · {formatDateTimeParts(nextMatch.kickoffAt).date}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }}>
                Phán ngay <ArrowRight size={12} />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {liveMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot w-2 h-2 bg-red-500 rounded-full inline-block" />
            <span className="text-xs font-black text-red-400 uppercase tracking-widest">Đang diễn ra</span>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-1 px-1">
            {liveMatches.map(m => (
              <Link key={m.id} href={`/matches/${m.id}`} className="flex-shrink-0">
                <div className="rounded-2xl p-4 w-72 border-[#00e676]/20 border shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${m.homeColor}22, #1a1d2e, ${m.awayColor}22)` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                      LIVE {m.minute}&apos;
                    </span>
                    {m.predictions.length > 0 && <span className="text-[10px] text-[#00e676] font-bold">● Đã đoán</span>}
                  </div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="relative w-8 h-5 rounded overflow-hidden flex-shrink-0"><Image src={flagUrl(m.homeFlag)} alt="" fill className="object-cover" unoptimized /></div>
                    <span className="text-sm font-bold text-white flex-1 truncate">{m.homeTeam}</span>
                    <span className="text-xl font-black text-white score-font">{m.scoreHome}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-5 rounded overflow-hidden flex-shrink-0"><Image src={flagUrl(m.awayFlag)} alt="" fill className="object-cover" unoptimized /></div>
                    <span className="text-sm font-bold text-white flex-1 truncate">{m.awayTeam}</span>
                    <span className="text-xl font-black text-white score-font">{m.scoreAway}</span>
                  </div>
                  <LiveMatchBar matchId={m.id} homeTeam={m.homeTeam} awayTeam={m.awayTeam} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-3xl p-5"
          style={{ background: "linear-gradient(135deg, rgba(0,230,118,0.06), rgba(0,188,212,0.04))", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Tổng xu</span>
            <TrendingUp size={14} className="text-[#00e676]" />
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-black text-white">{user.totalPoints}</span>
            <span className="text-sm font-bold text-[#00e676]">xu</span>
          </div>
          <p className="text-xs text-white/30">Tham gia từ {user.createdAt.toLocaleDateString("vi-VN")}</p>
        </div>

        <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Tuần này</span>
            <Target size={14} className="text-[#ffd700]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-2xl font-black text-white">{myWeekPicks}</div>
              <div className="text-[10px] text-white/40">Đã đoán</div>
            </div>
            <div>
              <div className="text-2xl font-black" style={{ color: "#00e676" }}>{myWeekWins}</div>
              <div className="text-[10px] text-white/40">Đoán đúng</div>
            </div>
            <div>
              <div className="text-2xl font-black" style={{ color: "#ffd700" }}>{winRate}%</div>
              <div className="text-[10px] text-white/40">Tỉ lệ tổng</div>
            </div>
            <div>
              <div className="text-2xl font-black text-orange-400 flex items-center gap-1"><Flame size={18}/>{user.streak}</div>
              <div className="text-[10px] text-white/40">Streak</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Activity size={15} className="text-[#00e676]" />
              Hoạt động hội
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {activities.map(item => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: `${activityColors[item.type] ?? "#7c3aed"}22`, color: activityColors[item.type] ?? "#7c3aed" }}>
                  {item.user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-bold text-white">{item.user.name}</span>
                    <span className="text-white/40"> {item.action} </span>
                    <span className="font-semibold" style={{ color: activityColors[item.type] ?? "#7c3aed" }}>{item.target}</span>
                  </p>
                  <div className="text-[10px] text-white/25 mt-0.5">{timeAgo(item.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-3xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#00bcd4]" />
                <span className="text-xs font-black text-white/60 uppercase tracking-widest">Hội của tôi</span>
              </div>
              <Link href="/groups" className="text-[10px] text-white/40 hover:text-white/70">Tất cả</Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {myGroupsWithRank.map(g => (
                <Link key={g.id} href={`/groups/${g.id}`}>
                  <div className="rounded-xl p-3 hover:bg-white/5 transition-colors" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{g.name}</div>
                        <div className="text-[10px] text-white/30">{g.memberCount} người · Hạng #{g.myRank}</div>
                      </div>
                      <ChevronRight size={12} className="text-white/20" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-4 relative overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,140,0,0.04))",
            border: "1px solid rgba(255,215,0,0.15)"
          }}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} style={{ color: "#ffd700" }} />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#ffd700" }}>Top tuần</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {topUsers.map((e, i) => (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="text-base">{["🥇","🥈","🥉"][i]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{e.name.split(" ").slice(-2).join(" ")}</div>
                  </div>
                  <span className="text-xs font-black" style={{ color: "#ffd700" }}>{e.totalPoints}</span>
                </div>
              ))}
            </div>
            <Link href="/leaderboard" className="mt-3 flex items-center justify-center gap-1 text-[10px] font-semibold text-white/50 hover:text-white pt-2 border-t border-white/5">
              Xem Bảng vàng <ChevronRight size={10} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
