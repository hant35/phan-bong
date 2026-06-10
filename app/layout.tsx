import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { CronRunner } from "@/components/cron-runner"
import { PwaInit } from "@/components/pwa-init"

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
        <PwaInit />
        <Navbar />
        <CronRunner />
        <main className="max-w-5xl mx-auto px-4 py-6 pb-28 md:pb-8">
          {children}
        </main>
      </body>
    </html>
  )
}
