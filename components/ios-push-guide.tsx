"use client"

import { useEffect, useState } from "react"
import { Share, PlusSquare } from "lucide-react"
import { needsIosPushInstallGuide } from "@/lib/push-client-device"

export function IosPushGuide({ compact = false }: { compact?: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(needsIosPushInstallGuide())
  }, [])

  if (!visible) return null

  if (compact) {
    return (
      <div className="rounded-xl p-3 text-xs text-white/55 space-y-1.5"
        style={{ background: "rgba(0,188,212,0.06)", border: "1px solid rgba(0,188,212,0.15)" }}>
        <p className="font-semibold text-[#00bcd4]">📱 iPhone/iPad: thêm vào Màn hình chính</p>
        <p>
          Bấm <Share size={11} className="inline -mt-0.5" /> Chia sẻ →{" "}
          <PlusSquare size={11} className="inline -mt-0.5" /> Thêm vào MH chính để nhận push.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4 text-xs text-white/55 space-y-2"
      style={{ background: "rgba(0,188,212,0.06)", border: "1px solid rgba(0,188,212,0.15)" }}>
      <p className="font-semibold text-[#00bcd4] text-sm">📱 Hướng dẫn thông báo trên iPhone/iPad</p>
      <p>Web Push trên iOS chỉ hoạt động khi mở app từ biểu tượng trên Màn hình chính (iOS 16.4+).</p>
      <ol className="list-decimal list-inside space-y-1 text-white/45">
        <li>Bấm nút <span className="inline-flex items-center gap-0.5 text-white/60"><Share size={12} /> Chia sẻ</span> trên Safari</li>
        <li>Chọn <span className="inline-flex items-center gap-0.5 text-white/60"><PlusSquare size={12} /> Thêm vào Màn hình chính</span></li>
        <li>Mở Phán Bóng từ biểu tượng vừa thêm → bật thông báo</li>
      </ol>
    </div>
  )
}
