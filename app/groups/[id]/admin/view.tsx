"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Settings, Users, Crown, Shield, User,
  Trash2, ChevronDown, ChevronUp, Check, X, AlertTriangle, Save, Trophy, RotateCcw, Eye, EyeOff, Zap, Lock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { flagUrl, formatDateTimeParts } from "@/lib/format"

interface GroupInfo { id: string; name: string; visibility: string; inviteCode: string }
interface MemberInfo {
  userId: string; name: string; avatar: string; email: string
  role: "owner" | "admin" | "member"; points: number; wins: number; losses: number
  predCount: number; joinedAt: string
}
interface MatchInfo {
  id: string; homeTeam: string; awayTeam: string; homeFlag: string; awayFlag: string
  kickoffAt: string; globalAhLine: number | null; globalOuLine: number | null
  config: {
    ahLine: number | null; ouLine: number | null; allowedBetTypes: string[]
    pointsMultiplier: number; lockMinutes: number; blindMode: boolean; updatedAt: string
  } | null
}
interface SeasonInfo {
  id: string; name: string; startedAt: string; endedAt: string | null
  standings: { rank: number; name: string; avatar: string; points: number; wins: number; losses: number }[]
}

const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  owner: { label: "Chủ hội", icon: <Crown size={11}/>, color: "#ffd700" },
  admin: { label: "Admin", icon: <Shield size={11}/>, color: "#00bcd4" },
  member: { label: "Thành viên", icon: <User size={11}/>, color: "rgba(255,255,255,0.3)" },
}

const BET_TYPE_INFO: Record<string, string> = {
  ah: "Kèo chấp",
  ou: "Tài/Xỉu",
  exact: "Tỉ số",
}

type ConfigState = {
  ahLine: string; ouLine: string; allowedBetTypes: string[]
  pointsMultiplier: number; lockMinutes: number; blindMode: boolean
  saving: boolean; saved: boolean; error: string | null
}

export function GroupAdminView({
  group, currentUserId, myRole, members, upcomingMatches, seasons,
}: {
  group: GroupInfo
  currentUserId: string
  myRole: "owner" | "admin"
  members: MemberInfo[]
  upcomingMatches: MatchInfo[]
  seasons: SeasonInfo[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<"matches" | "members" | "season">("matches")

  // ── Kèo per match ──
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)
  const [configs, setConfigs] = useState<Record<string, ConfigState>>({})

  function getConfig(match: MatchInfo): ConfigState {
    return configs[match.id] ?? {
      ahLine: match.config?.ahLine?.toString() ?? match.globalAhLine?.toString() ?? "",
      ouLine: match.config?.ouLine?.toString() ?? match.globalOuLine?.toString() ?? "",
      allowedBetTypes: match.config?.allowedBetTypes ?? ["ah", "ou", "exact"],
      pointsMultiplier: match.config?.pointsMultiplier ?? 1,
      lockMinutes: match.config?.lockMinutes ?? 0,
      blindMode: match.config?.blindMode ?? false,
      saving: false, saved: false, error: null,
    }
  }

  function setConfigField(matchId: string, field: string, value: unknown) {
    const match = upcomingMatches.find(m => m.id === matchId)!
    setConfigs(prev => ({ ...prev, [matchId]: { ...getConfig(match), [field]: value } }))
  }

  function toggleBetType(matchId: string, type: string) {
    const cfg = getConfig(upcomingMatches.find(m => m.id === matchId)!)
    const types = cfg.allowedBetTypes.includes(type)
      ? cfg.allowedBetTypes.filter(t => t !== type)
      : [...cfg.allowedBetTypes, type]
    setConfigField(matchId, "allowedBetTypes", types)
  }

  async function saveConfig(match: MatchInfo) {
    const cfg = getConfig(match)
    if (cfg.allowedBetTypes.length === 0) return
    setConfigField(match.id, "saving", true)
    setConfigField(match.id, "error", null)
    try {
      const res = await fetch(`/api/groups/${group.id}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          ahLine: cfg.ahLine ? parseFloat(cfg.ahLine) : null,
          ouLine: cfg.ouLine ? parseFloat(cfg.ouLine) : null,
          allowedBetTypes: cfg.allowedBetTypes,
          pointsMultiplier: cfg.pointsMultiplier,
          lockMinutes: cfg.lockMinutes,
          blindMode: cfg.blindMode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setConfigField(match.id, "error", data.error ?? "Có lỗi xảy ra")
      } else {
        setConfigField(match.id, "saved", true)
        setTimeout(() => setConfigField(match.id, "saved", false), 3000)
        router.refresh()
      }
    } catch {
      setConfigField(match.id, "error", "Lỗi kết nối")
    } finally {
      setConfigField(match.id, "saving", false)
    }
  }

  // ── Member management ──
  const [confirmKick, setConfirmKick] = useState<string | null>(null)
  const [memberLoading, setMemberLoading] = useState<string | null>(null)

  async function setRole(userId: string, role: "admin" | "member") {
    setMemberLoading(userId)
    try {
      await fetch(`/api/groups/${group.id}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      router.refresh()
    } finally { setMemberLoading(null) }
  }

  async function kickMember(userId: string) {
    setMemberLoading(userId)
    try {
      await fetch(`/api/groups/${group.id}/members/${userId}`, { method: "DELETE" })
      router.refresh()
    } finally { setMemberLoading(null); setConfirmKick(null) }
  }

  // ── Season reset ──
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [seasonName, setSeasonName] = useState("")
  const [seasonLoading, setSeasonLoading] = useState(false)
  const [seasonResult, setSeasonResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null)

  async function startNewSeason() {
    if (!seasonName.trim()) return
    setSeasonLoading(true)
    setSeasonResult(null)
    try {
      const res = await fetch(`/api/groups/${group.id}/season`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: seasonName.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSeasonResult({ ok: true, msg: `Đã lưu "${data.seasonName}" và reset ${data.memberCount} thành viên` })
        setSeasonName("")
        router.refresh()
      } else {
        setSeasonResult({ ok: false, msg: data.error ?? "Có lỗi" })
      }
    } catch {
      setSeasonResult({ ok: false, msg: "Lỗi kết nối" })
    } finally {
      setSeasonLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <Link href={`/groups/${group.id}`} className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors">
          <ArrowLeft size={15} /> {group.name}
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
          style={{ background: "rgba(0,230,118,0.1)", color: "#00e676", border: "1px solid rgba(0,230,118,0.2)" }}>
          <Settings size={11} /> Quản trị hội
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
        {[
          { id: "matches", label: "⚽ Cấu hình kèo" },
          { id: "members", label: "👥 Thành viên" },
          { id: "season", label: "🏆 Mùa giải" },
        ].map(({ id: tid, label }) => (
          <button key={tid} onClick={() => setTab(tid as typeof tab)}
            className={cn("flex-1 py-2 rounded-xl text-xs font-semibold transition-all",
              tab === tid ? "text-white" : "text-white/30")}
            style={tab === tid ? { background: "rgba(255,255,255,0.08)" } : {}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Cấu hình kèo ── */}
      {tab === "matches" && (
        <div className="space-y-3">
          <p className="text-xs text-white/30 px-1">
            Điều chỉnh kèo, hệ số điểm, chế độ khóa sớm và blind mode riêng cho hội.
            Chỉ được chỉnh trước 30 phút trước khi trận bắt đầu.
          </p>
          {upcomingMatches.length === 0 ? (
            <div className="text-center py-12 text-white/20 text-sm">Không có trận sắp tới để cấu hình</div>
          ) : upcomingMatches.map(match => {
            const cfg = getConfig(match)
            const isExpanded = expandedMatch === match.id
            const hasCustomConfig = match.config !== null
            const dt = formatDateTimeParts(match.kickoffAt)

            return (
              <div key={match.id} className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: hasCustomConfig ? "1px solid rgba(0,230,118,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  onClick={() => setExpandedMatch(isExpanded ? null : match.id)}>
                  <div className="relative w-7 h-5 rounded overflow-hidden flex-shrink-0">
                    <Image src={flagUrl(match.homeFlag)} alt="" fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{match.homeTeam} vs {match.awayTeam}</div>
                    <div className="text-[10px] text-white/30 mt-0.5 flex items-center gap-1.5">
                      <span>{dt.date} · {dt.time}</span>
                      {hasCustomConfig && match.config!.pointsMultiplier > 1 && (
                        <span className="font-black px-1 rounded text-[9px]"
                          style={{ background: "rgba(255,215,0,0.15)", color: "#ffd700" }}>×{match.config!.pointsMultiplier}</span>
                      )}
                      {hasCustomConfig && match.config!.blindMode && (
                        <span className="text-[9px]" style={{ color: "#a78bfa" }}>🙈 Blind</span>
                      )}
                      {hasCustomConfig && match.config!.lockMinutes > 0 && (
                        <span className="text-[9px]" style={{ color: "#fb923c" }}>
                          <Lock size={8} className="inline" /> {match.config!.lockMinutes}p
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative w-7 h-5 rounded overflow-hidden flex-shrink-0">
                    <Image src={flagUrl(match.awayFlag)} alt="" fill className="object-cover" unoptimized />
                  </div>
                  {hasCustomConfig && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(0,230,118,0.12)", color: "#00e676" }}>
                      Tùy chỉnh
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={14} className="text-white/30 flex-shrink-0" /> : <ChevronDown size={14} className="text-white/30 flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    {/* Loại kèo */}
                    <div>
                      <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2 mt-3">Loại kèo được phép</div>
                      <div className="flex gap-2">
                        {Object.entries(BET_TYPE_INFO).map(([key, label]) => (
                          <button key={key} onClick={() => toggleBetType(match.id, key)}
                            className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all border",
                              cfg.allowedBetTypes.includes(key) ? "text-[#0f1117]" : "text-white/30")}
                            style={cfg.allowedBetTypes.includes(key)
                              ? { background: "linear-gradient(135deg,#00e676,#00bcd4)", borderColor: "transparent" }
                              : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {cfg.allowedBetTypes.length === 0 && (
                        <p className="text-[10px] text-red-400 mt-1">Phải chọn ít nhất 1 loại kèo</p>
                      )}
                    </div>

                    {/* Kèo chấp */}
                    {cfg.allowedBetTypes.includes("ah") && (
                      <div>
                        <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                          Tỉ lệ chấp
                          {match.globalAhLine != null && <span className="normal-case font-normal text-white/20 ml-1">(Global: {match.globalAhLine > 0 ? "+" : ""}{match.globalAhLine})</span>}
                        </div>
                        <input type="number" step="0.25" value={cfg.ahLine}
                          onChange={e => setConfigField(match.id, "ahLine", e.target.value)}
                          placeholder={match.globalAhLine?.toString() ?? "VD: +0.5, -1, 0.75"}
                          className="w-full h-10 rounded-xl px-4 text-sm text-white placeholder:text-white/20 outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                      </div>
                    )}

                    {/* Tài/Xỉu */}
                    {cfg.allowedBetTypes.includes("ou") && (
                      <div>
                        <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                          Tài/Xỉu (số bàn)
                          {match.globalOuLine != null && <span className="normal-case font-normal text-white/20 ml-1">(Global: {match.globalOuLine})</span>}
                        </div>
                        <input type="number" step="0.25" min="0" value={cfg.ouLine}
                          onChange={e => setConfigField(match.id, "ouLine", e.target.value)}
                          placeholder={match.globalOuLine?.toString() ?? "VD: 2.5"}
                          className="w-full h-10 rounded-xl px-4 text-sm text-white placeholder:text-white/20 outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                      </div>
                    )}

                    {/* Hệ số điểm */}
                    <div>
                      <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Zap size={10} /> Hệ số điểm (Trận đinh)
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 5].map(x => (
                          <button key={x} onClick={() => setConfigField(match.id, "pointsMultiplier", x)}
                            className={cn("flex-1 py-2 rounded-xl text-sm font-black transition-all border")}
                            style={cfg.pointsMultiplier === x
                              ? { background: x === 1 ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#ffd700,#ff8f00)", borderColor: "transparent", color: x === 1 ? "white" : "#0f1117" }
                              : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}>
                            ×{x}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-white/20 mt-1">Thắng trận này được nhân hệ số điểm (×1 = bình thường)</p>
                    </div>

                    {/* Khóa sớm */}
                    <div>
                      <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Lock size={10} /> Khóa kèo sớm hơn
                      </div>
                      <div className="flex gap-2">
                        {[0, 30, 60, 120].map(mins => (
                          <button key={mins} onClick={() => setConfigField(match.id, "lockMinutes", mins)}
                            className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all border")}
                            style={cfg.lockMinutes === mins
                              ? { background: "rgba(251,146,60,0.15)", borderColor: "rgba(251,146,60,0.4)", color: "#fb923c" }
                              : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}>
                            {mins === 0 ? "Tắt" : `${mins}p`}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-white/20 mt-1">Khóa kèo trước kickoff X phút (hệ thống mặc định là 0p)</p>
                    </div>

                    {/* Blind mode */}
                    <div>
                      <button onClick={() => setConfigField(match.id, "blindMode", !cfg.blindMode)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                        style={cfg.blindMode
                          ? { background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }
                          : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center gap-2.5">
                          {cfg.blindMode ? <EyeOff size={15} style={{ color: "#a78bfa" }} /> : <Eye size={15} className="text-white/30" />}
                          <div className="text-left">
                            <div className={cn("text-sm font-bold", cfg.blindMode ? "" : "text-white/60")}
                              style={cfg.blindMode ? { color: "#a78bfa" } : {}}>
                              Blind Mode
                            </div>
                            <div className="text-[10px] text-white/25 mt-0.5">Ẩn pick của người khác cho đến khi kickoff</div>
                          </div>
                        </div>
                        <div className={cn("w-10 h-6 rounded-full relative transition-all",
                          cfg.blindMode ? "" : "")}
                          style={{ background: cfg.blindMode ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.1)" }}>
                          <div className={cn("absolute top-1 w-4 h-4 rounded-full transition-all",
                            cfg.blindMode ? "left-5" : "left-1")}
                            style={{ background: cfg.blindMode ? "#a78bfa" : "rgba(255,255,255,0.3)" }} />
                        </div>
                      </button>
                    </div>

                    {cfg.error && (
                      <div className="flex items-center gap-2 text-xs text-red-400 rounded-xl px-3 py-2"
                        style={{ background: "rgba(255,82,82,0.08)" }}>
                        <AlertTriangle size={12} /> {cfg.error}
                      </div>
                    )}

                    <button onClick={() => saveConfig(match)}
                      disabled={cfg.saving || cfg.allowedBetTypes.length === 0}
                      className={cn("w-full h-11 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50")}
                      style={cfg.saved
                        ? { background: "rgba(0,230,118,0.12)", color: "#00e676", border: "1px solid rgba(0,230,118,0.2)" }
                        : { background: "linear-gradient(135deg,#00e676,#00bcd4)", color: "#0f1117" }}>
                      {cfg.saved ? <><Check size={15}/> Đã lưu</> : <><Save size={15}/> {cfg.saving ? "Đang lưu..." : "Lưu cấu hình"}</>}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Quản lý thành viên ── */}
      {tab === "members" && (
        <div className="space-y-2">
          <p className="text-xs text-white/30 px-1 mb-3">
            Admin và chủ hội đều có thể phong admin mới. Chỉ chủ hội mới thu hồi quyền admin.
          </p>
          {members.map(m => {
            const roleInfo = ROLE_LABELS[m.role]
            const isMe = m.userId === currentUserId
            const isLoading = memberLoading === m.userId
            // admin có thể phong (member→admin), nhưng chỉ owner mới thu hồi (admin→member)
            const canPromote = m.role === "member"
            const canDemote = m.role === "admin" && myRole === "owner"
            const showRoleBtn = !isMe && m.role !== "owner" && (canPromote || canDemote)

            return (
              <div key={m.userId} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "white" }}>
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">{m.name}</span>
                    {isMe && <span className="text-[9px] text-white/30 font-bold">(bạn)</span>}
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${roleInfo.color}15`, color: roleInfo.color, border: `1px solid ${roleInfo.color}30` }}>
                      {roleInfo.icon} {roleInfo.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/25 mt-0.5">
                    {m.wins}W · {m.losses}L · {m.predCount} dự đoán · {m.points} xu
                  </div>
                </div>

                {!isMe && m.role !== "owner" && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {showRoleBtn && (
                      <button onClick={() => setRole(m.userId, canDemote ? "member" : "admin")}
                        disabled={isLoading}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                        style={canDemote
                          ? { background: "rgba(0,188,212,0.1)", color: "#00bcd4", border: "1px solid rgba(0,188,212,0.2)" }
                          : { background: "rgba(0,230,118,0.08)", color: "#00e676", border: "1px solid rgba(0,230,118,0.2)" }}>
                        {canDemote ? "Thu hồi admin" : "⬆ Phong admin"}
                      </button>
                    )}
                    {(myRole === "owner" || (myRole === "admin" && m.role === "member")) && (
                      confirmKick === m.userId ? (
                        <div className="flex gap-1">
                          <button onClick={() => kickMember(m.userId)} disabled={isLoading}
                            className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-50"
                            style={{ background: "rgba(255,82,82,0.2)", border: "1px solid rgba(255,82,82,0.3)" }}>
                            Xác nhận
                          </button>
                          <button onClick={() => setConfirmKick(null)}
                            className="px-2 py-1.5 rounded-lg text-[10px] font-bold"
                            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
                            <X size={11}/>
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmKick(m.userId)}
                          className="p-1.5 rounded-lg transition-all hover:bg-red-500/10" title="Kick">
                          <Trash2 size={14} className="text-white/20 hover:text-red-400 transition-colors" />
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Mùa giải ── */}
      {tab === "season" && (
        <div className="space-y-4">
          {/* Reset / Bắt đầu mùa mới */}
          {myRole === "owner" && (
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: "rgba(255,82,82,0.05)", border: "1px solid rgba(255,82,82,0.15)" }}>
              <div className="flex items-center gap-2">
                <RotateCcw size={15} style={{ color: "#ff5252" }} />
                <h3 className="text-sm font-bold text-white">Bắt đầu mùa giải mới</h3>
              </div>
              <p className="text-xs text-white/40">
                Lưu snapshot bảng xếp hạng hiện tại rồi reset điểm của tất cả thành viên về 0.
                Các dự đoán cũ vẫn giữ nguyên.
              </p>

              {!showSeasonModal ? (
                <button onClick={() => setShowSeasonModal(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "rgba(255,82,82,0.1)", color: "#ff5252", border: "1px solid rgba(255,82,82,0.2)" }}>
                  🔄 Reset & Bắt đầu mùa mới
                </button>
              ) : (
                <div className="space-y-3">
                  <input value={seasonName} onChange={e => setSeasonName(e.target.value)}
                    placeholder="VD: Vòng bảng, Mùa 1, Tháng 7..."
                    className="w-full h-11 rounded-xl px-4 text-sm text-white placeholder:text-white/20 outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />

                  {seasonResult && (
                    <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold",
                      seasonResult.ok ? "text-[#00e676]" : "text-red-400")}
                      style={seasonResult.ok
                        ? { background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)" }
                        : { background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.2)" }}>
                      {seasonResult.ok ? "✅" : "❌"} {seasonResult.msg}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={startNewSeason} disabled={seasonLoading || !seasonName.trim()}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                      style={{ background: "rgba(255,82,82,0.15)", color: "#ff5252", border: "1px solid rgba(255,82,82,0.3)" }}>
                      {seasonLoading ? "Đang xử lý..." : "Xác nhận reset"}
                    </button>
                    <button onClick={() => { setShowSeasonModal(false); setSeasonResult(null); setSeasonName("") }}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lịch sử mùa giải */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider px-1 mb-3">
              Lịch sử mùa giải ({seasons.length})
            </p>
            {seasons.length === 0 ? (
              <div className="text-center py-8 text-white/20 text-sm">Chưa có mùa giải nào được lưu</div>
            ) : (
              <div className="space-y-2">
                {seasons.map(s => (
                  <div key={s.id} className="rounded-2xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <button className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                      onClick={() => setExpandedSeason(expandedSeason === s.id ? null : s.id)}>
                      <div>
                        <div className="flex items-center gap-2">
                          <Trophy size={13} style={{ color: "#ffd700" }} />
                          <span className="text-sm font-bold text-white">{s.name}</span>
                        </div>
                        <div className="text-[10px] text-white/25 mt-0.5">
                          {new Date(s.startedAt).toLocaleDateString("vi-VN")}
                          {s.endedAt && ` · ${new Date(s.endedAt).toLocaleDateString("vi-VN")}`}
                          {" · "}{s.standings.length} thành viên
                        </div>
                      </div>
                      {expandedSeason === s.id
                        ? <ChevronUp size={14} className="text-white/30" />
                        : <ChevronDown size={14} className="text-white/30" />}
                    </button>

                    {expandedSeason === s.id && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        {s.standings.slice(0, 10).map((p, i) => (
                          <div key={p.rank} className="flex items-center gap-3 px-4 py-2.5"
                            style={{ borderBottom: i < s.standings.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                            <span className="w-5 text-center text-xs font-bold text-white/25">#{p.rank}</span>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                              style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "white" }}>
                              {p.avatar}
                            </div>
                            <span className="flex-1 text-sm text-white/80 truncate">{p.name}</span>
                            <span className="text-xs font-bold" style={{ color: "#ffd700" }}>{p.points} xu</span>
                            <span className="text-[10px] text-white/30">{p.wins}W/{p.losses}L</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
