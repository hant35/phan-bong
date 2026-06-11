"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Shield, Zap, Users, Trash2, Save, Check, X, UserMinus, ChevronDown, ChevronUp, Search, HelpCircle, Plus, RefreshCw, Database, CheckSquare, Square, AlertCircle, CheckCircle2, Bell, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { flagUrl, formatDateTimeParts } from "@/lib/format"

interface MatchData {
  id: string; homeTeam: string; awayTeam: string; homeFlag: string; awayFlag: string
  kickoffAt: string; stage: string; status: string
  scoreHome: number | null; scoreAway: number | null; minute: number | null
  ahLine: number | null; ouLine: number | null; predictionsCount: number
}

interface GroupData {
  id: string; name: string; visibility: string; inviteCode: string
  adminId: string; adminName: string; memberCount: number
  members: { userId: string; name: string; avatar: string; points: number }[]
}

interface UserData {
  id: string; name: string; avatar: string | null; role: string
  email: string; hasGoogle: boolean; groupPointsSum: number
  predictionCount: number; groupCount: number; createdAt: string
}

type Tab = "matches" | "groups" | "sync" | "notify" | "users"

export function AdminView({
  matches, groups, users,
}: {
  matches: MatchData[]; groups: GroupData[]; users: UserData[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("matches")
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showAddMatch, setShowAddMatch] = useState(false)
  const [newMatch, setNewMatch] = useState({
    homeTeam: "", awayTeam: "", homeFlag: "", awayFlag: "",
    homeColor: "", awayColor: "", stage: "Vòng bảng",
    kickoffDate: "", kickoffTime: "", venue: "",
    ahLine: "", ouLine: "",
  })
  const [addingMatch, setAddingMatch] = useState(false)

  // ── Users tab state ──
  const [userSearch, setUserSearch] = useState("")

  // ── Sync state ──
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<{
    source: string; updated: number; errors: string[]; details: string[]
    request?: { method: string; url: string; headers: Record<string, string> }
    response?: { status: number; statusText: string; matchesFromApi: number; matchesInDb: number; sampleData?: Record<string, unknown> | null }
  }[] | null>(null)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [keysLoaded, setKeysLoaded] = useState(false)
  const [keySaving, setKeySaving] = useState<string | null>(null)
  const [keySavedId, setKeySavedId] = useState<string | null>(null)

  // ── Notify state ──
  const [notifyTarget, setNotifyTarget] = useState<"all" | "group">("all")
  const [notifyGroupId, setNotifyGroupId] = useState("")
  const [notifyTitle, setNotifyTitle] = useState("")
  const [notifyBody, setNotifyBody] = useState("")
  const [notifyUrl, setNotifyUrl] = useState("")
  const [notifySending, setNotifySending] = useState(false)
  const [notifyResult, setNotifyResult] = useState<{
    ok: boolean; delivered?: number; failed?: number; expired?: number; total?: number; error?: string
  } | null>(null)

  async function sendNotify() {
    if (!notifyTitle.trim() || !notifyBody.trim()) return
    setNotifySending(true)
    setNotifyResult(null)
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notifyTitle, body: notifyBody,
          url: notifyUrl || undefined,
          target: notifyTarget,
          groupId: notifyTarget === "group" ? notifyGroupId : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setNotifyResult({ ok: false, error: data.error ?? "Lỗi không xác định" })
      } else {
        setNotifyResult({
          ok: true,
          delivered: data.delivered,
          failed: data.failed,
          expired: data.expired,
          total: data.total,
        })
      }
    } catch {
      setNotifyResult({ ok: false, error: "Lỗi kết nối" })
    } finally {
      setNotifySending(false)
    }
  }

  // ── Grading result modal ──
  const [gradingResult, setGradingResult] = useState<{
    homeTeam: string; awayTeam: string; scoreHome: number; scoreAway: number
    wins: number; losses: number; skipped: number; totalPredictions: number
    details: { name: string; betType: string; result: string; reason: string }[]
    skippedUsers: { name: string; groupName: string }[]
  } | null>(null)

  // Load saved API keys from DB on mount
  const loadSavedKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings?keys=apikey_football-data,apikey_api-football")
      if (res.ok) {
        const { settings } = await res.json()
        const loaded: Record<string, string> = {}
        if (settings["apikey_football-data"]) loaded["football-data"] = settings["apikey_football-data"]
        if (settings["apikey_api-football"]) loaded["api-football"] = settings["apikey_api-football"]
        setApiKeys(loaded)
      }
    } catch { /* ignore */ }
    setKeysLoaded(true)
  }, [])

  useEffect(() => { loadSavedKeys() }, [loadSavedKeys])

  const DATA_SOURCES = [
    {
      id: "football-data",
      name: "Football-Data.org",
      description: "Tỉ số trực tiếp, lịch thi đấu, trạng thái trận đấu. Miễn phí 10 req/phút.",
      features: ["Tỉ số", "Trạng thái", "Lịch thi đấu"],
      keyRequired: "FOOTBALL_DATA_API_KEY",
      color: "#4fc3f7",
    },
    {
      id: "openfootball",
      name: "OpenFootball (GitHub)",
      description: "Dữ liệu từ GitHub JSON. Hoàn toàn miễn phí, không cần API key.",
      features: ["Tỉ số", "Lịch thi đấu"],
      keyRequired: null,
      color: "#00e676",
    },
    {
      id: "api-football",
      name: "API-Football",
      description: "Tỉ số live (15s), kèo pre-match. Miễn phí 100 req/ngày.",
      features: ["Tỉ số", "Trạng thái", "Kèo AH/OU", "Lịch thi đấu"],
      keyRequired: "API_FOOTBALL_KEY",
      color: "#ffd700",
    },
  ]

  function toggleSource(id: string) {
    setSelectedSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  async function saveOneKey(sourceId: string) {
    setKeySaving(sourceId)
    setKeySavedId(null)
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { [`apikey_${sourceId}`]: apiKeys[sourceId] || "" } }),
      })
      setKeySavedId(sourceId)
      setTimeout(() => setKeySavedId(null), 3000)
    } catch { /* ignore */ }
    setKeySaving(null)
  }

  async function saveApiKeys() {
    const settings: Record<string, string> = {}
    if (apiKeys["football-data"] !== undefined) settings["apikey_football-data"] = apiKeys["football-data"]
    if (apiKeys["api-football"] !== undefined) settings["apikey_api-football"] = apiKeys["api-football"]
    if (Object.keys(settings).length === 0) return
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    })
  }

  async function runSync() {
    if (selectedSources.length === 0) return
    setSyncing(true)
    setSyncResults(null)
    try {
      // Save keys to DB first
      await saveApiKeys()
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: selectedSources, apiKeys }),
      })
      const data = await res.json()
      setSyncResults(data.results || [])
      router.refresh()
    } catch {
      setSyncResults([{ source: "System", updated: 0, errors: ["Lỗi kết nối server"], details: [] }])
    }
    setSyncing(false)
  }

  async function createMatch() {
    if (!newMatch.homeTeam || !newMatch.awayTeam || !newMatch.homeFlag || !newMatch.awayFlag || !newMatch.kickoffDate || !newMatch.kickoffTime) return
    setAddingMatch(true)
    const kickoffAt = new Date(`${newMatch.kickoffDate}T${newMatch.kickoffTime}:00+07:00`).toISOString()
    const res = await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeTeam: newMatch.homeTeam, awayTeam: newMatch.awayTeam,
        homeFlag: newMatch.homeFlag, awayFlag: newMatch.awayFlag,
        homeColor: newMatch.homeColor || null, awayColor: newMatch.awayColor || null,
        kickoffAt, stage: newMatch.stage, venue: newMatch.venue || null,
        ahLine: newMatch.ahLine ? parseFloat(newMatch.ahLine) : null,
        ouLine: newMatch.ouLine ? parseFloat(newMatch.ouLine) : null,
      }),
    })
    if (res.ok) {
      setShowAddMatch(false)
      setNewMatch({ homeTeam: "", awayTeam: "", homeFlag: "", awayFlag: "", homeColor: "", awayColor: "", stage: "Vòng bảng", kickoffDate: "", kickoffTime: "", venue: "", ahLine: "", ouLine: "" })
      router.refresh()
    }
    setAddingMatch(false)
  }

  async function deleteMatch(id: string, name: string) {
    if (!confirm(`Xóa trận "${name}"? Tất cả lượt đoán sẽ bị xóa theo.`)) return
    setSaving(id)
    await fetch("/api/admin/matches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setSaving(null)
    router.refresh()
  }

  // ── Match editing ──
  const [matchEdits, setMatchEdits] = useState<Record<string, Partial<MatchData>>>({})

  function editMatch(id: string, field: string, value: unknown) {
    setMatchEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function saveMatch(id: string) {
    const edits = matchEdits[id]
    if (!edits) return
    setSaving(id)
    const res = await fetch("/api/admin/matches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...edits }),
    })
    if (res.ok) {
      const data = await res.json()
      setSaved(id)
      setMatchEdits(prev => { const n = { ...prev }; delete n[id]; return n })
      setTimeout(() => setSaved(null), 2000)
      router.refresh()
      // Show grading result modal if match was graded
      if (data.gradingResult) {
        setGradingResult(data.gradingResult)
      }
    }
    setSaving(null)
  }

  // ── Group editing ──
  const [groupEdits, setGroupEdits] = useState<Record<string, Partial<GroupData>>>({})

  function editGroup(id: string, field: string, value: unknown) {
    setGroupEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function saveGroup(id: string) {
    const edits = groupEdits[id]
    if (!edits) return
    setSaving(id)
    const res = await fetch("/api/admin/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...edits }),
    })
    if (res.ok) {
      setSaved(id)
      setGroupEdits(prev => { const n = { ...prev }; delete n[id]; return n })
      setTimeout(() => setSaved(null), 2000)
      router.refresh()
    }
    setSaving(null)
  }

  async function deleteGroup(id: string, name: string) {
    if (!confirm(`Xóa hội "${name}"? Hành động không thể hoàn tác.`)) return
    setSaving(id)
    await fetch("/api/admin/groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setSaving(null)
    router.refresh()
  }

  async function kickMember(groupId: string, userId: string, name: string) {
    if (!confirm(`Xóa "${name}" khỏi hội?`)) return
    await fetch("/api/admin/groups/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, userId }),
    })
    router.refresh()
  }

  // ── Filter matches ──
  const filteredMatches = matches.filter(m => {
    if (!search) return true
    const s = search.toLowerCase()
    return m.homeTeam.toLowerCase().includes(s) || m.awayTeam.toLowerCase().includes(s) || m.stage.toLowerCase().includes(s)
  })

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "matches", label: "Quản lý kèo", icon: <Zap size={15} /> },
    { id: "groups", label: "Quản lý hội", icon: <Users size={15} /> },
    { id: "sync", label: "Đồng bộ dữ liệu", icon: <Database size={15} /> },
    { id: "notify", label: "Thông báo", icon: <Bell size={15} /> },
    { id: "users", label: "Người dùng", icon: <Users size={15} /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #ff5252, #ff1744)" }}>
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Admin Panel</h1>
          <p className="text-xs text-white/40">Quản lý kèo & hội</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto hide-scrollbar">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0",
              tab === t.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
            )}>
            {t.icon} {t.label}
          </button>
        ))}
        <button onClick={() => setShowHelp(true)}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-[#ffd700]/70 hover:text-[#ffd700] hover:bg-[#ffd700]/10 transition-all whitespace-nowrap flex-shrink-0"
          title="Hướng dẫn set kèo">
          <HelpCircle size={16} /> <span className="hidden sm:inline">Hướng dẫn</span>
        </button>
      </div>

      {/* ══════════ MATCHES TAB ══════════ */}
      {tab === "matches" && (
        <div className="space-y-4">
          {/* Search + Add */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text" placeholder="Tìm trận (tên đội, bảng)..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00e676]/50"
              />
            </div>
            <button onClick={() => setShowAddMatch(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-[#0f1117] flex-shrink-0 hover:scale-105 transition-all"
              style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
              <Plus size={16} /> Thêm trận
            </button>
          </div>

          <div className="text-xs text-white/30">{filteredMatches.length} trận</div>

          {/* Match list */}
          <div className="space-y-3">
            {filteredMatches.map(m => {
              const edits = matchEdits[m.id] ?? {}
              const hasEdits = Object.keys(edits).length > 0
              const dt = formatDateTimeParts(m.kickoffAt)

              return (
                <div key={m.id} className="rounded-2xl p-4 border border-white/6"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  {/* Match header */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                    <div className="relative w-8 h-5 rounded overflow-hidden flex-shrink-0">
                      <Image src={flagUrl(m.homeFlag)} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <span className="font-bold text-white text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{m.homeTeam}</span>
                    <span className="text-white/45 text-xs font-black">VS</span>
                    <span className="font-bold text-white text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{m.awayTeam}</span>
                    <div className="relative w-8 h-5 rounded overflow-hidden flex-shrink-0">
                      <Image src={flagUrl(m.awayFlag)} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <span className="text-[10px] text-white/30">{dt.time}</span>
                      <span className="text-[10px] text-white/45 hidden sm:inline">{dt.date}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        m.status === "scheduled" ? "bg-blue-500/15 text-blue-400" :
                        m.status === "live" ? "bg-red-500/15 text-red-400" :
                        "bg-white/5 text-white/30"
                      )}>
                        {m.status === "scheduled" ? "Sắp đá" : m.status === "live" ? "LIVE" : "Kết thúc"}
                      </span>
                    </div>
                  </div>

                  {/* Editable fields */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Kèo chấp */}
                    <div>
                      <label className="text-[10px] text-white/30 uppercase font-bold block mb-1">Kèo chấp (AH)</label>
                      <input type="number" step="0.25"
                        value={edits.ahLine ?? m.ahLine ?? ""}
                        onChange={e => editMatch(m.id, "ahLine", e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#00e676]/50"
                      />
                    </div>
                    {/* Tài xỉu */}
                    <div>
                      <label className="text-[10px] text-white/30 uppercase font-bold block mb-1">Tổng bàn thắng (O/U)</label>
                      <input type="number" step="0.25"
                        value={edits.ouLine ?? m.ouLine ?? ""}
                        onChange={e => editMatch(m.id, "ouLine", e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#00e676]/50"
                      />
                    </div>
                    {/* Status */}
                    <div>
                      <label className="text-[10px] text-white/30 uppercase font-bold block mb-1">Trạng thái</label>
                      <select
                        value={(edits.status ?? m.status)}
                        onChange={e => editMatch(m.id, "status", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#00e676]/50 appearance-none"
                      >
                        <option value="scheduled" className="bg-[#1a1d2e]">Sắp đá</option>
                        <option value="live" className="bg-[#1a1d2e]">Đang đá</option>
                        <option value="finished" className="bg-[#1a1d2e]">Kết thúc</option>
                      </select>
                    </div>
                    {/* Score */}
                    <div>
                      <label className="text-[10px] text-white/30 uppercase font-bold block mb-1">Tỉ số</label>
                      <div className="flex items-center gap-1">
                        <input type="number" min="0"
                          value={edits.scoreHome ?? m.scoreHome ?? ""}
                          onChange={e => editMatch(m.id, "scoreHome", e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white text-center focus:outline-none focus:border-[#00e676]/50"
                          placeholder="H"
                        />
                        <span className="text-white/45 font-bold">–</span>
                        <input type="number" min="0"
                          value={edits.scoreAway ?? m.scoreAway ?? ""}
                          onChange={e => editMatch(m.id, "scoreAway", e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white text-center focus:outline-none focus:border-[#00e676]/50"
                          placeholder="A"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3 text-[10px] text-white/50">
                      <span>{m.stage}</span>
                      <span>·</span>
                      <span>{m.predictionsCount} lượt đoán</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {saved === m.id && (
                        <span className="flex items-center gap-1 text-[#00e676] text-xs font-bold">
                          <Check size={14} /> Đã lưu
                        </span>
                      )}
                      <button onClick={() => deleteMatch(m.id, `${m.homeTeam} vs ${m.awayTeam}`)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/45 hover:text-red-400 transition-colors"
                        title="Xóa trận">
                        <Trash2 size={14} />
                      </button>
                      {hasEdits && (
                        <button onClick={() => saveMatch(m.id)} disabled={saving === m.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0f1117] transition-all hover:scale-105 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
                          <Save size={12} />
                          {saving === m.id ? "Đang lưu..." : "Lưu"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════ GROUPS TAB ══════════ */}
      {tab === "groups" && (
        <div className="space-y-4">
          {groups.map(g => {
            const edits = groupEdits[g.id] ?? {}
            const hasEdits = Object.keys(edits).length > 0
            const expanded = expandedGroup === g.id

            return (
              <div key={g.id} className="rounded-2xl border border-white/6 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                {/* Group header */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[#00bcd4]" />
                      <span className="font-bold text-white">{g.name}</span>
                      <span className="text-[10px] text-white/45 bg-white/5 px-2 py-0.5 rounded-full">{g.memberCount} người</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpandedGroup(expanded ? null : g.id)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button onClick={() => deleteGroup(g.id, g.name)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Editable fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-white/30 uppercase font-bold block mb-1">Tên hội</label>
                      <input type="text"
                        value={edits.name ?? g.name}
                        onChange={e => editGroup(g.id, "name", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#00e676]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/30 uppercase font-bold block mb-1">Hiển thị</label>
                      <select
                        value={edits.visibility ?? g.visibility}
                        onChange={e => editGroup(g.id, "visibility", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#00e676]/50 appearance-none"
                      >
                        <option value="private" className="bg-[#1a1d2e]">🔒 Riêng tư</option>
                        <option value="public" className="bg-[#1a1d2e]">🌍 Công khai</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/30 uppercase font-bold block mb-1">Chuyển admin</label>
                      <select
                        value={edits.adminId ?? g.adminId}
                        onChange={e => editGroup(g.id, "adminId", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#00e676]/50 appearance-none"
                      >
                        {users.map(u => (
                          <option key={u.id} value={u.id} className="bg-[#1a1d2e]">{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3 text-[10px] text-white/50">
                      <span>Mã mời: <span className="text-white/50 font-mono">{g.inviteCode}</span></span>
                      <span>·</span>
                      <span>Admin: {g.adminName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {saved === g.id && (
                        <span className="flex items-center gap-1 text-[#00e676] text-xs font-bold">
                          <Check size={14} /> Đã lưu
                        </span>
                      )}
                      {hasEdits && (
                        <button onClick={() => saveGroup(g.id)} disabled={saving === g.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0f1117] transition-all hover:scale-105 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
                          <Save size={12} />
                          {saving === g.id ? "Đang lưu..." : "Lưu"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Members list (expandable) */}
                {expanded && (
                  <div className="border-t border-white/5 p-4">
                    <h3 className="text-xs font-bold text-white/40 uppercase mb-3">Thành viên ({g.members.length})</h3>
                    <div className="space-y-2">
                      {g.members.map(mem => (
                        <div key={mem.userId} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black"
                              style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }}>
                              {mem.avatar}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{mem.name}</div>
                              <div className="text-[10px] text-white/30">{mem.points} xu</div>
                            </div>
                            {mem.userId === g.adminId && (
                              <span className="text-[10px] bg-[#ffd700]/15 text-[#ffd700] px-2 py-0.5 rounded-full font-bold">Admin</span>
                            )}
                          </div>
                          {mem.userId !== g.adminId && (
                            <button onClick={() => kickMember(g.id, mem.userId, mem.name)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <UserMinus size={12} /> Xóa
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ══════════ SYNC TAB ══════════ */}
      {tab === "sync" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-white/6 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Database size={16} className="text-[#00e676]" /> Chọn nguồn dữ liệu
            </h3>
            <p className="text-xs text-white/40 mb-4">Chọn một hoặc nhiều nguồn miễn phí để đồng bộ tỉ số, trạng thái và kèo. Có thể chạy đồng thời.</p>

            <div className="space-y-3">
              {DATA_SOURCES.map(src => {
                const selected = selectedSources.includes(src.id)
                return (
                  <div key={src.id}
                    className={cn(
                      "w-full rounded-xl border p-4 transition-all",
                      selected ? "border-[#00e676]/40 bg-[#00e676]/5" : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    )}>
                    <div className="flex items-start gap-3 cursor-pointer" onClick={() => toggleSource(src.id)}>
                      <div className="mt-0.5">
                        {selected
                          ? <CheckSquare size={18} className="text-[#00e676]" />
                          : <Square size={18} className="text-white/45" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-white">{src.name}</span>
                          {src.keyRequired && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold">
                              API Key
                            </span>
                          )}
                          {!src.keyRequired && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00e676]/15 text-[#00e676] font-bold">
                              Không cần key
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 mb-2">{src.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {src.features.map(f => (
                            <span key={f} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: `${src.color}15`, color: src.color }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* API Key input */}
                    {src.keyRequired && selected && (
                      <div className="mt-3 ml-[30px]">
                        <label className="text-[10px] text-white/30 uppercase font-bold block mb-1">
                          {src.keyRequired}
                        </label>
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1">
                            <input
                              type={showKeys[src.id] ? "text" : "password"}
                              value={apiKeys[src.id] || ""}
                              onChange={e => setApiKeys(p => ({ ...p, [src.id]: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              placeholder="Nhập API key..."
                              className="w-full px-3 py-2 pr-16 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/45 focus:outline-none focus:border-[#00e676]/50 font-mono"
                            />
                            <button
                              onClick={e => { e.stopPropagation(); setShowKeys(p => ({ ...p, [src.id]: !p[src.id] })) }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 hover:text-white/60 font-bold px-1.5 py-0.5 rounded hover:bg-white/5">
                              {showKeys[src.id] ? "Ẩn" : "Hiện"}
                            </button>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); saveOneKey(src.id) }}
                            disabled={keySaving === src.id}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-[#0f1117] flex-shrink-0 hover:scale-105 transition-all disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
                            {keySaving === src.id ? "..." : keySavedId === src.id ? <><Check size={12} /> Đã lưu</> : <><Save size={12} /> Lưu</>}
                          </button>
                        </div>
                        <p className="text-[10px] text-white/45 mt-1">
                          {apiKeys[src.id] && keysLoaded
                            ? <span className="text-[#00e676]/60">✓ Key đã lưu trong hệ thống</span>
                            : <>Nhập key sẽ được lưu lại. Để trống dùng key từ <code className="text-white/30 bg-white/5 px-1 rounded">.env</code></>
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Sync button */}
            <button onClick={runSync} disabled={syncing || selectedSources.length === 0}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-[#0f1117] transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Đang đồng bộ..." : `Đồng bộ ${selectedSources.length > 0 ? `(${selectedSources.length} nguồn)` : ""}`}
            </button>
          </div>

          {/* Results */}
          {syncResults && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Kết quả đồng bộ</h3>
              {syncResults.map((r, i) => (
                <div key={i} className="rounded-xl border border-white/6 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <span className="font-bold text-sm text-white">{r.source}</span>
                    <div className="flex items-center gap-2">
                      {r.errors.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                          <AlertCircle size={12} /> {r.errors.length} lỗi
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#00e676]">
                        <CheckCircle2 size={12} /> {r.updated} cập nhật
                      </span>
                    </div>
                  </div>

                  {/* Request */}
                  {r.request && (
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-[10px] text-[#4fc3f7] uppercase font-bold mb-2">▶ Request</p>
                      <div className="rounded-lg bg-black/30 p-3 font-mono text-[11px] space-y-1 overflow-x-auto">
                        <p className="text-[#00e676]">{r.request.method} <span className="text-white/60">{r.request.url}</span></p>
                        {Object.entries(r.request.headers).map(([k, v]) => (
                          <p key={k} className="text-white/30">{k}: <span className="text-white/50">{v}</span></p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response */}
                  {r.response && (
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-[10px] text-[#ffd700] uppercase font-bold mb-2">◀ Response</p>
                      <div className="rounded-lg bg-black/30 p-3 font-mono text-[11px] space-y-1 overflow-x-auto">
                        <p>
                          <span className="text-white/30">Status: </span>
                          <span className={r.response.status >= 200 && r.response.status < 300 ? "text-[#00e676]" : "text-red-400"}>
                            {r.response.status} {r.response.statusText}
                          </span>
                        </p>
                        <p className="text-white/30">Trận từ API: <span className="text-white/60">{r.response.matchesFromApi}</span></p>
                        <p className="text-white/30">Trận trong DB: <span className="text-white/60">{r.response.matchesInDb}</span></p>
                        {r.response.sampleData && (
                          <details className="mt-2">
                            <summary className="text-white/30 cursor-pointer hover:text-white/50 text-[10px]">Xem dữ liệu mẫu (1 trận)</summary>
                            <pre className="mt-1 text-[10px] text-white/40 whitespace-pre-wrap break-all">
                              {JSON.stringify(r.response.sampleData, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {r.errors.length > 0 && (
                    <div className="px-4 py-3 border-b border-white/5 space-y-1">
                      {r.errors.map((e, j) => (
                        <p key={j} className="text-xs text-red-400/80 bg-red-500/10 rounded-lg px-3 py-1.5">{e}</p>
                      ))}
                    </div>
                  )}

                  {/* Details */}
                  <div className="px-4 py-3">
                    {r.details.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[10px] text-[#00e676] uppercase font-bold mb-1">Đã cập nhật</p>
                        {r.details.map((d, j) => (
                          <p key={j} className="text-[11px] text-white/40">✓ {d}</p>
                        ))}
                      </div>
                    ) : r.errors.length === 0 ? (
                      <p className="text-xs text-white/30">Không có dữ liệu mới cần cập nhật.</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ NOTIFY TAB ══════════ */}
      {tab === "notify" && (
        <div className="space-y-5">
          <div className="rounded-3xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Bell size={16} className="text-[#00e676]" />
              <h2 className="text-base font-bold text-white">Gửi thông báo push</h2>
            </div>

            {/* Target selector */}
            <div>
              <p className="text-xs text-white/40 uppercase font-bold mb-2">Gửi đến</p>
              <div className="flex gap-2">
                {[
                  { id: "all" as const, label: "🌐 Tất cả người dùng" },
                  { id: "group" as const, label: "👥 Một hội cụ thể" },
                ].map(o => (
                  <button key={o.id} onClick={() => { setNotifyTarget(o.id); setNotifyResult(null) }}
                    className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      notifyTarget === o.id ? "text-white" : "text-white/40 hover:text-white/60"
                    )}
                    style={notifyTarget === o.id
                      ? { background: "rgba(0,230,118,0.15)", border: "1px solid rgba(0,230,118,0.3)" }
                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }
                    }>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Group picker */}
            {notifyTarget === "group" && (
              <div>
                <p className="text-xs text-white/40 uppercase font-bold mb-2">Chọn hội</p>
                <select value={notifyGroupId} onChange={e => setNotifyGroupId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="">-- Chọn hội --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.memberCount} thành viên)</option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div>
              <p className="text-xs text-white/40 uppercase font-bold mb-2">Tiêu đề</p>
              <input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)}
                placeholder="VD: ⚽ Trận đấu sắp bắt đầu!"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/35 outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>

            {/* Body */}
            <div>
              <p className="text-xs text-white/40 uppercase font-bold mb-2">Nội dung</p>
              <textarea value={notifyBody} onChange={e => setNotifyBody(e.target.value)}
                placeholder="Nội dung thông báo..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/35 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>

            {/* URL (optional) */}
            <div>
              <p className="text-xs text-white/40 uppercase font-bold mb-2">URL khi bấm vào <span className="normal-case font-normal">(không bắt buộc)</span></p>
              <input value={notifyUrl} onChange={e => setNotifyUrl(e.target.value)}
                placeholder="/matches hoặc /groups/..."
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/35 outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>

            {/* Result */}
            {notifyResult && (
              <div className={cn("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold",
                notifyResult.ok ? "text-[#00e676]" : "text-red-400"
              )}
              style={notifyResult.ok
                ? { background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)" }
                : { background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.2)" }}>
                {notifyResult.ok
                  ? <><CheckCircle2 size={16}/> Đã gửi {notifyResult.delivered}/{notifyResult.total} thiết bị
                    {notifyResult.failed ? ` (${notifyResult.failed} lỗi)` : ""}
                    {notifyResult.expired ? ` (${notifyResult.expired} hết hạn)` : ""}</>
                  : <><AlertCircle size={16}/> {notifyResult.error}</>
                }
              </div>
            )}

            {/* Send button */}
            <button onClick={sendNotify}
              disabled={notifySending || !notifyTitle.trim() || !notifyBody.trim() || (notifyTarget === "group" && !notifyGroupId)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-[#0f1117] transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
              <Send size={15} />
              {notifySending ? "Đang gửi..." : "Gửi thông báo"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════ USERS TAB ══════════ */}
      {tab === "users" && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Tổng users", value: users.length, color: "#00e676" },
              { label: "Có hội", value: users.filter(u => u.groupCount > 0).length, color: "#00bcd4" },
              { label: "Đã đoán", value: users.filter(u => u.predictionCount > 0).length, color: "#ffd700" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
              placeholder="Tìm tên hoặc email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>

          {/* User list */}
          <div className="space-y-2">
            {users
              .filter(u => {
                if (!userSearch) return true
                const s = userSearch.toLowerCase()
                return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
              })
              .map((u, i) => {
                const avatarColors = [
                  "linear-gradient(135deg,#00e676,#00bcd4)",
                  "linear-gradient(135deg,#7c3aed,#ec4899)",
                  "linear-gradient(135deg,#ffd700,#ff8f00)",
                  "linear-gradient(135deg,#0288d1,#26c6da)",
                  "linear-gradient(135deg,#ff5252,#ff1744)",
                ]
                return (
                  <div key={u.id} className="rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: avatarColors[i % avatarColors.length], color: "white" }}>
                      {u.avatar ?? u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">{u.name}</span>
                        {u.role === "admin" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                            style={{ background: "rgba(255,82,82,0.15)", color: "#ff5252" }}>Admin</span>
                        )}
                        {u.hasGoogle && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                            style={{ background: "rgba(66,133,244,0.15)", color: "#4285f4" }}>Google</span>
                        )}
                        {u.groupCount === 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                            style={{ background: "rgba(255,152,0,0.15)", color: "#ff9800" }}>Chưa có hội</span>
                        )}
                      </div>
                      <div className="text-xs text-white/30 truncate mt-0.5">{u.email}</div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px] text-white/30">Đoán</span>
                        <span className="text-xs font-bold text-white/60">{u.predictionCount}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px] text-white/30">Hội</span>
                        <span className="text-xs font-bold text-white/60">{u.groupCount}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px]" style={{ color: "#ffd700" }}>⬡</span>
                        <span className="text-xs font-bold" style={{ color: "#ffd700" }}>{u.groupPointsSum}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ══════════ HELP MODAL ══════════ */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10"
            style={{ background: "linear-gradient(180deg, #1a1d2e 0%, #0f1117 100%)" }}
            onClick={e => e.stopPropagation()}>

            {/* Close button */}
            <button onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors z-10">
              <X size={18} />
            </button>

            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)" }}>
                  <HelpCircle size={20} className="text-[#0f1117]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Hướng dẫn set kèo</h2>
                  <p className="text-xs text-white/40">Chi tiết cách điều chỉnh kèo cho từng trận đấu</p>
                </div>
              </div>

              {/* Section 1: Kèo chấp */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
                    style={{ background: "rgba(0,230,118,0.15)", color: "#00e676" }}>1</span>
                  <h3 className="font-bold text-white">Kèo chấp (Asian Handicap — AH)</h3>
                </div>
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Kèo chấp thể hiện <span className="text-white font-bold">đội nhà chấp đội khách bao nhiêu trái</span>. Giá trị âm = đội nhà chấp, giá trị dương = đội khách chấp.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                      <span className="text-base">⚖️</span>
                      <div>
                        <div className="text-sm font-bold text-white">-1.5</div>
                        <div className="text-xs text-white/40">Đội nhà chấp 1.5 trái. User chọn &quot;Nhà&quot; thắng nếu nhà thắng cách biệt 2+. User chọn &quot;Khách&quot; thắng nếu khách thắng/hòa/thua 1.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                      <span className="text-base">⚖️</span>
                      <div>
                        <div className="text-sm font-bold text-white">-0.5</div>
                        <div className="text-xs text-white/40">Đội nhà chấp nửa trái. Nhà thắng = user chọn Nhà thắng kèo. Hòa/thua = user chọn Khách thắng kèo.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                      <span className="text-base">⚖️</span>
                      <div>
                        <div className="text-sm font-bold text-white">0</div>
                        <div className="text-xs text-white/40">Kèo đồng banh (hòa = hoàn xu). Ai thắng trận thắng kèo.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                      <span className="text-base">⚖️</span>
                      <div>
                        <div className="text-sm font-bold text-white">+0.75</div>
                        <div className="text-xs text-white/40">Đội khách được chấp 0.75 trái (tức nhà kém hơn). User chọn Khách thắng nếu khách thắng/hòa, thắng nửa nếu thua 1.</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl p-3 border border-[#ffd700]/20" style={{ background: "rgba(255,215,0,0.05)" }}>
                    <p className="text-xs text-[#ffd700]/80 leading-relaxed">
                      <span className="font-bold">Mẹo:</span> Nhập theo bước 0.25 (ví dụ: -2, -1.75, -1.5, -1.25, -1, -0.75, -0.5, -0.25, 0, +0.25...). Đội mạnh hơn thường có giá trị âm lớn hơn.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Tài xỉu */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
                    style={{ background: "rgba(0,188,212,0.15)", color: "#00bcd4" }}>2</span>
                  <h3 className="font-bold text-white">Tài / Xỉu (Over/Under — O/U)</h3>
                </div>
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Tổng số bàn thắng của trận đấu so với mốc bạn đặt. User đoán <span className="text-white font-bold">Tài</span> (tổng bàn &gt; mốc) hoặc <span className="text-white font-bold">Xỉu</span> (tổng bàn &lt; mốc).
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                      <span className="text-base">📊</span>
                      <div>
                        <div className="text-sm font-bold text-white">2.5</div>
                        <div className="text-xs text-white/40">Phổ biến nhất. Tổng bàn 3+ = Trên thắng. Tổng bàn 0-2 = Dưới thắng. Không có hòa.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                      <span className="text-base">📊</span>
                      <div>
                        <div className="text-sm font-bold text-white">3.0</div>
                        <div className="text-xs text-white/40">Tổng bàn 4+ = Tài. Tổng bàn 0-2 = Xỉu. Đúng 3 bàn = hòa (hoàn xu).</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                      <span className="text-base">📊</span>
                      <div>
                        <div className="text-sm font-bold text-white">3.5</div>
                        <div className="text-xs text-white/40">Dùng cho trận dự kiến nhiều bàn. Tổng bàn 4+ = Tài. Tổng bàn 0-3 = Xỉu.</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl p-3 border border-[#00bcd4]/20" style={{ background: "rgba(0,188,212,0.05)" }}>
                    <p className="text-xs text-[#00bcd4]/80 leading-relaxed">
                      <span className="font-bold">Mẹo:</span> Trận có đội mạnh gặp đội yếu thường set 3.0 - 3.5. Trận cân sức có thể set 2.0 - 2.5. Trận phòng ngự tốt set 1.5 - 2.0.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Trạng thái & Tỉ số */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
                    style={{ background: "rgba(255,82,82,0.15)", color: "#ff5252" }}>3</span>
                  <h3 className="font-bold text-white">Trạng thái & Tỉ số</h3>
                </div>
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Sắp đá</span>
                      <div className="text-xs text-white/40 pt-0.5">Trận chưa bắt đầu. User có thể đặt/sửa pick. Kèo có thể điều chỉnh.</div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Đang đá</span>
                      <div className="text-xs text-white/40 pt-0.5">Trận đang diễn ra. User KHÔNG thể đặt pick mới. Cập nhật tỉ số realtime. Có thể nhập phút hiện tại.</div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/30">Kết thúc</span>
                      <div className="text-xs text-white/40 pt-0.5">Trận đã kết thúc. Nhập tỉ số cuối cùng. Hệ thống sẽ chấm điểm dựa trên tỉ số này.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Quy trình */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
                    style={{ background: "rgba(255,215,0,0.15)", color: "#ffd700" }}>4</span>
                  <h3 className="font-bold text-white">Quy trình vận hành trận đấu</h3>
                </div>
                <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-[#00e676]/15 text-[#00e676]">1</div>
                        <div className="w-0.5 h-full bg-white/5 mt-1" />
                      </div>
                      <div className="pb-4">
                        <div className="text-sm font-bold text-white">Trước trận</div>
                        <div className="text-xs text-white/40 mt-1">Set kèo chấp (AH) và tài xỉu (O/U) dựa trên phân tích đội. Có thể điều chỉnh nhiều lần trước khi trận bắt đầu.</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-red-500/15 text-red-400">2</div>
                        <div className="w-0.5 h-full bg-white/5 mt-1" />
                      </div>
                      <div className="pb-4">
                        <div className="text-sm font-bold text-white">Trận bắt đầu</div>
                        <div className="text-xs text-white/40 mt-1">Chuyển trạng thái sang &quot;Đang đá&quot;. User không thể đặt pick mới. Cập nhật tỉ số và phút thi đấu theo thời gian thực.</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-[#ffd700]/15 text-[#ffd700]">3</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Kết thúc trận</div>
                        <div className="text-xs text-white/40 mt-1">Chuyển sang &quot;Kết thúc&quot;, nhập tỉ số cuối cùng. Hệ thống tự động chấm điểm win/loss cho tất cả predictions dựa trên kèo đã set.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ADD MATCH MODAL ══════════ */}
      {showAddMatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowAddMatch(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-6"
            style={{ background: "linear-gradient(145deg, #1a1d28, #0f1117)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Plus size={20} className="text-[#00e676]" /> Thêm trận đấu</h3>
              <button onClick={() => setShowAddMatch(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {/* Teams */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Đội nhà *</label>
                  <input value={newMatch.homeTeam} onChange={e => setNewMatch(p => ({ ...p, homeTeam: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" placeholder="VD: Việt Nam" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Đội khách *</label>
                  <input value={newMatch.awayTeam} onChange={e => setNewMatch(p => ({ ...p, awayTeam: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" placeholder="VD: Nhật Bản" />
                </div>
              </div>

              {/* Flags */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Mã cờ nhà * <span className="text-white/45">(vn, jp...)</span></label>
                  <input value={newMatch.homeFlag} onChange={e => setNewMatch(p => ({ ...p, homeFlag: e.target.value.toLowerCase() }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" placeholder="vn" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Mã cờ khách *</label>
                  <input value={newMatch.awayFlag} onChange={e => setNewMatch(p => ({ ...p, awayFlag: e.target.value.toLowerCase() }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" placeholder="jp" />
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Màu đội nhà</label>
                  <input value={newMatch.homeColor} onChange={e => setNewMatch(p => ({ ...p, homeColor: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" placeholder="#da251d" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Màu đội khách</label>
                  <input value={newMatch.awayColor} onChange={e => setNewMatch(p => ({ ...p, awayColor: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" placeholder="#bc002d" />
                </div>
              </div>

              {/* Date/Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Ngày (VN) *</label>
                  <input type="date" value={newMatch.kickoffDate} onChange={e => setNewMatch(p => ({ ...p, kickoffDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Giờ (VN) *</label>
                  <input type="time" value={newMatch.kickoffTime} onChange={e => setNewMatch(p => ({ ...p, kickoffTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" />
                </div>
              </div>

              {/* Stage & Venue */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Giai đoạn *</label>
                  <select value={newMatch.stage} onChange={e => setNewMatch(p => ({ ...p, stage: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none">
                    <option value="Vòng bảng">Vòng bảng</option>
                    <option value="Vòng 32">Vòng 32</option>
                    <option value="Vòng 16">Vòng 16</option>
                    <option value="Tứ kết">Tứ kết</option>
                    <option value="Bán kết">Bán kết</option>
                    <option value="Chung kết">Chung kết</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Sân vận động</label>
                  <input value={newMatch.venue} onChange={e => setNewMatch(p => ({ ...p, venue: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" placeholder="MetLife Stadium" />
                </div>
              </div>

              {/* Odds */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Kèo chấp (AH)</label>
                  <input value={newMatch.ahLine} onChange={e => setNewMatch(p => ({ ...p, ahLine: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" placeholder="-0.5" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Tổng bàn thắng (O/U)</label>
                  <input value={newMatch.ouLine} onChange={e => setNewMatch(p => ({ ...p, ouLine: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#00e676] outline-none" placeholder="2.5" />
                </div>
              </div>

              {/* Preview */}
              {newMatch.homeFlag && newMatch.awayFlag && (
                <div className="flex items-center justify-center gap-4 py-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Image src={flagUrl(newMatch.homeFlag)} alt="" width={28} height={20} unoptimized className="rounded" />
                    <span className="text-white text-sm font-medium">{newMatch.homeTeam || "?"}</span>
                  </div>
                  <span className="text-white/30 text-xs font-bold">VS</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{newMatch.awayTeam || "?"}</span>
                    <Image src={flagUrl(newMatch.awayFlag)} alt="" width={28} height={20} unoptimized className="rounded" />
                  </div>
                </div>
              )}

              {/* Submit */}
              <button onClick={createMatch} disabled={addingMatch || !newMatch.homeTeam || !newMatch.awayTeam || !newMatch.homeFlag || !newMatch.awayFlag || !newMatch.kickoffDate || !newMatch.kickoffTime}
                className="w-full py-3 rounded-xl text-sm font-bold text-[#0f1117] transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
                {addingMatch ? "Đang tạo..." : "Tạo trận đấu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ GRADING RESULT MODAL ══════════ */}
      {gradingResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setGradingResult(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-6"
            style={{ background: "linear-gradient(145deg, #1a1d28, #0f1117)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">⚡ Kết quả chấm điểm</h3>
              <button onClick={() => setGradingResult(null)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><X size={20} /></button>
            </div>

            {/* Match score */}
            <div className="text-center mb-5 py-4 rounded-xl bg-white/5">
              <p className="text-sm text-white/50 mb-1">{gradingResult.homeTeam} vs {gradingResult.awayTeam}</p>
              <p className="text-4xl font-black text-white">{gradingResult.scoreHome} - {gradingResult.scoreAway}</p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center rounded-xl bg-[#00e676]/10 py-3">
                <p className="text-2xl font-black text-[#00e676]">{gradingResult.wins}</p>
                <p className="text-[10px] text-[#00e676]/60 font-bold">Đoán đúng</p>
              </div>
              <div className="text-center rounded-xl bg-red-500/10 py-3">
                <p className="text-2xl font-black text-red-400">{gradingResult.losses}</p>
                <p className="text-[10px] text-red-400/60 font-bold">Đoán sai</p>
              </div>
              <div className="text-center rounded-xl bg-white/5 py-3">
                <p className="text-2xl font-black text-white/40">{gradingResult.skipped}</p>
                <p className="text-[10px] text-white/30 font-bold">Bỏ đoán</p>
              </div>
            </div>

            {/* Details */}
            {gradingResult.details.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-white/40 font-bold mb-2">Chi tiết</p>
                <div className="space-y-1.5">
                  {gradingResult.details.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-lg"
                      style={{ background: d.result === "win" ? "rgba(0,230,118,0.06)" : "rgba(255,82,82,0.06)" }}>
                      <span className={`text-sm ${d.result === "win" ? "text-[#00e676]" : "text-red-400"}`}>
                        {d.result === "win" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm text-white font-medium flex-1 truncate">{d.name}</span>
                      <span className={`text-xs font-bold ${d.result === "win" ? "text-[#00e676]" : "text-red-400"}`}>
                        {d.result === "win" ? "+1 đúng" : "sai"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped users */}
            {gradingResult.skippedUsers.length > 0 && (
              <div>
                <p className="text-xs text-white/40 font-bold mb-2">Bỏ dự đoán (thành viên hội)</p>
                <div className="space-y-1">
                  {gradingResult.skippedUsers.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-white/[0.02]">
                      <span className="text-white/45 text-sm">⊘</span>
                      <span className="text-sm text-white/40 flex-1 truncate">{s.name}</span>
                      <span className="text-[10px] text-white/45">{s.groupName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gradingResult.totalPredictions === 0 && gradingResult.skipped === 0 && (
              <p className="text-sm text-white/30 text-center py-4">Chưa có ai dự đoán trận này.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
