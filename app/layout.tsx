import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { BottomNav } from "@/components/bottom-nav"
import { CronRunner } from "@/components/cron-runner"
import { PwaInit } from "@/components/pwa-init"
import { NavigationProgress } from "@/components/navigation-progress"
import { Onboarding } from "@/components/onboarding"
import { PushNotificationPrompt } from "@/components/push-prompt"
import { ToastProvider } from "@/components/toast"
import { PullToRefresh } from "@/components/pull-to-refresh"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f1117",
}

export const metadata: Metadata = {
  title: "Phán Bóng ⚽",
  description: "Dự đoán kết quả World Cup 2026 cùng hội bạn bè",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Phán Bóng" },
  icons: {
    apple: "/icons/icon-192.png",
    icon: "/icons/icon-192.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>
        <ToastProvider>
          {/* Fixed/absolute overlays — outside flex shell */}
          <Suspense fallback={null}><NavigationProgress /></Suspense>
          <PwaInit />
          <PullToRefresh />
          <Onboarding />
          <PushNotificationPrompt />
          <CronRunner />

          {/* App shell: flex column chiếm toàn bộ màn hình
              → header + main + bottom-nav không bao giờ shift trên iOS */}
          <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
            <Navbar />
            <main id="main-scroll"
              className="flex-1 overflow-y-auto"
              style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="max-w-5xl mx-auto px-4 py-6 pb-6 md:pb-8">
                {children}
              </div>
            </main>
            <BottomNav />
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}
