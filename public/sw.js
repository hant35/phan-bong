const CACHE = "phanbong-v2"
const PRECACHE = ["/", "/matches", "/leaderboard", "/offline"]

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return
  const url = new URL(e.request.url)
  // Chỉ xử lý http/https cùng origin — bỏ qua chrome-extension, data:, ...
  if (url.protocol !== "http:" && url.protocol !== "https:") return
  if (url.origin !== self.location.origin) return
  // Không cache API calls
  if (url.pathname.startsWith("/api/")) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Chỉ cache response hợp lệ (basic, status 200)
        if (res.ok && res.type === "basic") {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match("/offline")))
  )
})

// ── Push Notifications ──
self.addEventListener("push", e => {
  let data = { title: "Phán Bóng ⚽", body: "Có thông báo mới!", url: "/" }
  if (e.data) {
    try { data = { ...data, ...JSON.parse(e.data.text()) } } catch {}
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: { url: data.url },
      vibrate: [200, 100, 200],
      tag: "phanbong-notification",
      renotify: true,
    })
  )
})

self.addEventListener("notificationclick", e => {
  e.notification.close()
  const url = e.notification.data?.url || "/"
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
