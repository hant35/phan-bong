"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, ArrowRight, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [showPass, setShowPass] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const body = mode === "login" ? { email, password } : { email, password, name }
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Có lỗi"); return }
      router.push("/")
      router.refresh()
    } catch {
      setError("Lỗi mạng")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden" style={{ background: "#0a0c12" }}>
      {/* Background stadium */}
      {/* Pitch decoration full-page */}
      <svg className="absolute inset-0 z-0 w-full h-full opacity-5" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice">
        <rect x="50" y="50" width="900" height="600" fill="none" stroke="#00e676" strokeWidth="3"/>
        <line x1="500" y1="50" x2="500" y2="650" stroke="#00e676" strokeWidth="2"/>
        <circle cx="500" cy="350" r="120" fill="none" stroke="#00e676" strokeWidth="2"/>
        <circle cx="500" cy="350" r="8" fill="#00e676"/>
        <rect x="50" y="215" width="180" height="270" fill="none" stroke="#00e676" strokeWidth="2"/>
        <rect x="770" y="215" width="180" height="270" fill="none" stroke="#00e676" strokeWidth="2"/>
        <rect x="50" y="280" width="80" height="140" fill="none" stroke="#00e676" strokeWidth="2"/>
        <rect x="870" y="280" width="80" height="140" fill="none" stroke="#00e676" strokeWidth="2"/>
        <circle cx="50" cy="50" r="80" fill="none" stroke="#00e676" strokeWidth="2"/>
        <circle cx="950" cy="50" r="80" fill="none" stroke="#00e676" strokeWidth="2"/>
        <circle cx="50" cy="650" r="80" fill="none" stroke="#00e676" strokeWidth="2"/>
        <circle cx="950" cy="650" r="80" fill="none" stroke="#00e676" strokeWidth="2"/>
      </svg>
      <div className="absolute inset-0 z-0" style={{
        background: "radial-gradient(ellipse at 50% 50%, rgba(0,230,118,0.06) 0%, rgba(10,12,18,0.97) 65%)"
      }} />

      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #00e676, transparent)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #00bcd4, transparent)" }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", boxShadow: "0 0 40px rgba(0,230,118,0.3)" }}>
            ⚽
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: "#00e676" }}>Phán Bóng</h1>
          <p className="text-white/30 mt-2 text-sm">Dự đoán World Cup 2026 · Thắng không cần may mắn</p>
        </div>

        <div className="glass rounded-3xl p-6">
          {/* Mode toggle */}
          <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            {[
              { id: "login", label: "Đăng nhập" },
              { id: "register", label: "Đăng ký" },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setMode(id as typeof mode)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                style={mode === id
                  ? { background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }
                  : { color: "rgba(255,255,255,0.35)" }}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5 block">
                  Tên hiển thị
                </label>
                <input type="text" placeholder='VD: "Trần Văn Phán"' value={name} onChange={e => setName(e.target.value)} required
                  className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#00e676]/40 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#00e676]/40 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5 block">Mật khẩu</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  className="w-full px-4 py-3 pr-11 rounded-2xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#00e676]/40 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-3 py-2 text-xs text-red-300" style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.2)" }}>
                {error}
              </div>
            )}

            {mode === "login" && (
              <div className="text-[10px] text-white/30 px-1">
                Demo: <code className="text-white/50">ban@phanbong.vn</code> / <code className="text-white/50">phanbong123</code>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm mt-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", color: "#0f1117" }}>
              {loading ? <><Loader2 size={16} className="animate-spin"/>Đang xử lý...</> : (
                <>
                  {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs text-white/20" style={{ background: "transparent" }}>hoặc</span>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm font-medium text-white/60 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Tiếp tục với Google
            </button>
          </form>

          {mode === "login" && (
            <p className="text-center text-xs text-white/20 mt-3">
              <Link href="/forgot-password" className="hover:text-white/50 transition-colors">Quên mật khẩu?</Link>
            </p>
          )}
        </div>

        <div className="text-center mt-4">
          <Link href="/matches" className="text-sm font-medium transition-colors hover:text-white/60"
            style={{ color: "#00e676" }}>
            Xem demo không cần đăng nhập →
          </Link>
        </div>

        <p className="text-center text-xs text-white/15 mt-3">
          Không tiền thật. Không cá cược. Thuần điểm vui.
        </p>
      </div>
    </div>
  )
}
