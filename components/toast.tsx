"use client"

import { createContext, useContext, useState, useCallback, useRef } from "react"
import { CheckCircle2, XCircle, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "info"
interface Toast { id: number; type: ToastType; message: string }

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

const STYLES: Record<ToastType, { icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle2, color: "#00e676", bg: "rgba(0,230,118,0.12)", border: "rgba(0,230,118,0.3)" },
  error: { icon: XCircle, color: "#ff5252", bg: "rgba(255,82,82,0.12)", border: "rgba(255,82,82,0.3)" },
  info: { icon: Info, color: "#00bcd4", bg: "rgba(0,188,212,0.12)", border: "rgba(0,188,212,0.3)" },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => remove(id), 3500)
  }, [remove])

  const value: ToastContextValue = {
    toast,
    success: useCallback((m: string) => toast(m, "success"), [toast]),
    error: useCallback((m: string) => toast(m, "error"), [toast]),
    info: useCallback((m: string) => toast(m, "info"), [toast]),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map(t => {
          const s = STYLES[t.type]
          const Icon = s.icon
          return (
            <div key={t.id}
              className="toast-in pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-md"
              style={{ background: s.bg, border: `1px solid ${s.border}`, backdropFilter: "blur(16px)" }}>
              <Icon size={18} style={{ color: s.color }} className="flex-shrink-0" />
              <span className="flex-1 text-sm font-semibold text-white leading-snug">{t.message}</span>
              <button onClick={() => remove(t.id)} className="flex-shrink-0 p-0.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={14} className="text-white/50" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
