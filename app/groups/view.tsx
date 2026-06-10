"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Users, Lock, Globe, ChevronRight, Copy, Check, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface GroupItem {
  id: string; name: string; visibility: string; inviteCode: string;
  memberCount: number; myRank: number; totalPoints: number; recentActivity: string;
}

export function GroupsView({ groups }: { groups: GroupItem[] }) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [groupName, setGroupName] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [joinCode, setJoinCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  async function createGroup() {
    setSubmitting(true); setError(null)
    try {
      const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: groupName, visibility }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowCreate(false); setGroupName("")
      router.refresh()
    } catch { setError("Lỗi mạng") }
    finally { setSubmitting(false) }
  }

  async function joinGroup() {
    if (!joinCode.trim()) return
    setSubmitting(true); setError(null)
    try {
      const res = await fetch(`/api/groups/_/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteCode: joinCode }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setJoinCode("")
      router.refresh()
    } catch { setError("Lỗi mạng") }
    finally { setSubmitting(false) }
  }

  return (
    <div>
      <div className="relative rounded-3xl overflow-hidden mb-5 h-36" style={{
        background: "linear-gradient(135deg, #0d1a2e 0%, #0a2215 60%, #1a1530 100%)"
      }}>
        <svg className="absolute right-0 top-0 h-full opacity-8" viewBox="0 0 300 150" preserveAspectRatio="xMaxYMid slice">
          {[...Array(8)].map((_, i) => (
            <g key={i} transform={`translate(${20 + i*35}, 0)`}>
              <circle cx="15" cy="20" r="12" fill="rgba(0,230,118,0.6)"/>
              <rect x="5" y="32" width="20" height="30" rx="5" fill="rgba(0,230,118,0.4)"/>
              <rect x="3" y="62" width="8" height="25" rx="3" fill="rgba(0,230,118,0.3)"/>
              <rect x="13" y="62" width="8" height="25" rx="3" fill="rgba(0,230,118,0.3)"/>
            </g>
          ))}
        </svg>
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(15,17,23,0.8) 40%, rgba(15,17,23,0.4) 100%)" }} />
        <div className="absolute inset-0 flex items-end justify-between p-5">
          <div>
            <h1 className="text-xl font-black text-white">Hội của tôi</h1>
            <p className="text-white/40 text-sm">Cùng đoán, cùng vui, cùng chịu thua</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }}>
            <Plus size={15} /> Tạo hội
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="glass rounded-2xl p-4 mb-4 fade-in">
          <h2 className="font-bold text-white mb-3">Tạo hội mới</h2>
          <div className="space-y-3">
            <input type="text" placeholder="Tên hội..." value={groupName} onChange={e => setGroupName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#00e676]/30"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "private", icon: Lock, label: "Riêng tư", desc: "Chỉ người được mời" },
                { id: "public", icon: Globe, label: "Công khai", desc: "Ai cũng có thể thấy" },
              ].map(({ id, icon: Icon, label, desc }) => (
                <button key={id} onClick={() => setVisibility(id as typeof visibility)}
                  className="text-left p-3 rounded-xl border transition-all"
                  style={visibility === id
                    ? { background: "rgba(0,230,118,0.08)", borderColor: "rgba(0,230,118,0.25)" }
                    : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon size={13} style={{ color: visibility === id ? "#00e676" : "rgba(255,255,255,0.3)" }} />
                    <span className="text-sm font-semibold" style={{ color: visibility === id ? "#00e676" : "rgba(255,255,255,0.6)" }}>{label}</span>
                  </div>
                  <p className="text-xs text-white/25">{desc}</p>
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/40"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}>Hủy</button>
              <button disabled={!groupName.trim() || submitting} onClick={createGroup}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={groupName.trim()
                  ? { background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}>
                {submitting && <Loader2 size={14} className="animate-spin"/>} Tạo hội 🎉
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-4 mb-5">
        <p className="text-sm font-bold text-white/60 mb-2">Tham gia hội bằng mã</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input type="text" placeholder="Nhập mã hội (VD: IT26XA)" value={joinCode} onChange={e => setJoinCode(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 uppercase focus:outline-none focus:ring-1 focus:ring-[#00e676]/30"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <button onClick={joinGroup} disabled={submitting} className="px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(255,255,255,0.08)", color: "white" }}>Vào</button>
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      <p className="text-xs font-bold text-white/25 uppercase tracking-widest mb-3">
        Đang tham gia ({groups.length})
      </p>
      <div className="flex flex-col gap-4">
        {groups.map(group => (
          <Link key={group.id} href={`/groups/${group.id}`}>
            <div className="rounded-2xl p-4 hover:bg-white/5 transition-all group"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white">{group.name}</h3>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5")}
                      style={group.visibility === "private"
                        ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }
                        : { background: "rgba(0,188,212,0.1)", color: "#00bcd4" }}>
                      {group.visibility === "private" ? <><Lock size={9} /> Riêng tư</> : <><Globe size={9} /> Công khai</>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Users size={11} />{group.memberCount} thành viên</span>
                    <span>Hạng <strong className="text-white/50">{group.myRank}</strong></span>
                    <span style={{ color: "#ffd700" }} className="font-bold">{group.totalPoints} xu</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/15 group-hover:text-white/30 mt-0.5" />
              </div>
              <p className="text-xs text-white/20 italic mb-3 truncate">&ldquo;{group.recentActivity}&rdquo;</p>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-xs text-white/20">Mã mời</span>
                <button onClick={e => { e.preventDefault(); copyCode(group.inviteCode) }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold hover:bg-white/5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>
                  {group.inviteCode}
                  {copied === group.inviteCode ? <Check size={11} style={{ color: "#00e676" }} /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
