"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, ChevronRight } from "lucide-react"

const STEPS = [
  {
    emoji: "⚽",
    title: "Chào mừng đến Phán Bóng!",
    desc: "Dự đoán kết quả World Cup 2026 và ganh đua với bạn bè. Hoàn toàn miễn phí — không tiền thật.",
  },
  {
    emoji: "🏟️",
    title: "Bước 1: Vào hội",
    desc: "Tạo hoặc tham gia một hội bằng mã mời. Chỉ khi vào hội bạn mới có thể đặt kèo và theo dõi bảng xếp hạng nội bộ.",
    cta: { label: "Tạo / Tham gia hội", href: "/groups" },
  },
  {
    emoji: "🎯",
    title: "Bước 2: Đặt kèo",
    desc: 'Vào "Lịch trận" và chọn trận muốn đoán. Có 3 loại kèo: Kèo chấp, Tổng bàn thắng, và Tỉ số chính xác. Điều chỉnh độ tự tin để nhân xu.',
    cta: { label: "Xem lịch trận", href: "/matches" },
  },
  {
    emoji: "🏆",
    title: "Bước 3: Ganh đua",
    desc: "Đoán đúng kiếm xu, leo bảng xếp hạng trong hội. Streak càng dài càng tốt. Người nhiều xu nhất cuối giải lên ngôi!",
    cta: { label: "Bắt đầu thôi!", href: "/groups" },
  },
]

export function Onboarding() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("pb_onboarded")) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem("pb_onboarded", "1")
    setVisible(false)
    window.dispatchEvent(new Event("pb_onboarded"))
  }

  if (!visible) return null

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      onClick={dismiss}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-3xl p-7 text-center"
        style={{ background: "linear-gradient(160deg, #1a1d28 0%, #0f1117 100%)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-white/10 text-white/30 hover:text-white transition-colors">
          <X size={16} />
        </button>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all"
              style={{
                width: i === step ? 20 : 6, height: 6,
                background: i === step ? "#00e676" : "rgba(255,255,255,0.1)",
              }} />
          ))}
        </div>

        <div className="text-5xl mb-4">{s.emoji}</div>
        <h2 className="text-xl font-black text-white mb-2">{s.title}</h2>
        <p className="text-sm text-white/50 leading-relaxed mb-6">{s.desc}</p>

        <div className="flex flex-col gap-2">
          {s.cta && isLast ? (
            <Link href={s.cta.href} onClick={dismiss}
              className="w-full py-3 rounded-xl text-sm font-bold text-[#0f1117] flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
              {s.cta.label} <ChevronRight size={14} />
            </Link>
          ) : s.cta ? (
            <>
              <button onClick={() => setStep(step + 1)}
                className="w-full py-3 rounded-xl text-sm font-bold text-[#0f1117] flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
                Tiếp theo <ChevronRight size={14} />
              </button>
              <Link href={s.cta.href} onClick={dismiss}
                className="text-xs text-white/30 hover:text-white/60 transition-colors py-1">
                {s.cta.label} →
              </Link>
            </>
          ) : (
            <button onClick={() => setStep(step + 1)}
              className="w-full py-3 rounded-xl text-sm font-bold text-[#0f1117] flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #00e676, #00bcd4)" }}>
              Tiếp theo <ChevronRight size={14} />
            </button>
          )}

          {step === 0 && (
            <button onClick={dismiss} className="text-xs text-white/45 hover:text-white/40 py-1 transition-colors">
              Bỏ qua, tôi biết rồi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
