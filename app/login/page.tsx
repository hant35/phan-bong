"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Phiên đăng nhập hết hạn, vui lòng thử lại.",
  token_failed: "Không thể xác thực với Google, vui lòng thử lại.",
  profile_failed: "Không lấy được thông tin tài khoản Google.",
  server_error: "Lỗi máy chủ, vui lòng thử lại sau.",
}

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden" style={{ background: "#0a0c12" }}>
      {/* Pitch decoration */}
      <svg className="absolute inset-0 z-0 w-full h-full opacity-5" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice">
        <rect x="50" y="50" width="900" height="600" fill="none" stroke="#00e676" strokeWidth="3"/>
        <line x1="500" y1="50" x2="500" y2="650" stroke="#00e676" strokeWidth="2"/>
        <circle cx="500" cy="350" r="120" fill="none" stroke="#00e676" strokeWidth="2"/>
        <circle cx="500" cy="350" r="8" fill="#00e676"/>
        <rect x="50" y="215" width="180" height="270" fill="none" stroke="#00e676" strokeWidth="2"/>
        <rect x="770" y="215" width="180" height="270" fill="none" stroke="#00e676" strokeWidth="2"/>
        <circle cx="50" cy="50" r="80" fill="none" stroke="#00e676" strokeWidth="2"/>
        <circle cx="950" cy="50" r="80" fill="none" stroke="#00e676" strokeWidth="2"/>
        <circle cx="50" cy="650" r="80" fill="none" stroke="#00e676" strokeWidth="2"/>
        <circle cx="950" cy="650" r="80" fill="none" stroke="#00e676" strokeWidth="2"/>
      </svg>
      <div className="absolute inset-0 z-0" style={{
        background: "radial-gradient(ellipse at 50% 50%, rgba(0,230,118,0.06) 0%, rgba(10,12,18,0.97) 65%)"
      }} />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #00e676, transparent)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #00bcd4, transparent)" }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5"
            style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)", boxShadow: "0 0 50px rgba(0,230,118,0.25)" }}>
            ⚽
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: "#00e676" }}>Phán Bóng</h1>
          <p className="text-white/30 mt-2 text-sm">Dự đoán World Cup 2026 · Thắng không cần may mắn</p>
        </div>

        <div className="glass rounded-3xl p-6 flex flex-col gap-4">
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-red-300 text-center"
              style={{ background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.2)" }}>
              {ERROR_MESSAGES[error] ?? "Có lỗi xảy ra, vui lòng thử lại."}
            </div>
          )}

          <p className="text-center text-white/40 text-sm">Đăng nhập để bắt đầu dự đoán</p>

          <a href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Tiếp tục với Google
          </a>
        </div>

        <p className="text-center text-xs text-white/15 mt-5">
          Không tiền thật. Không cá cược. Thuần điểm vui.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
