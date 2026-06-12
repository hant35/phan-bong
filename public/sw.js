const CACHE = "phanbong-v4"
const PRECACHE = ["/offline.html"]

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
  if (url.protocol !== "http:" && url.protocol !== "https:") return
  if (url.origin !== self.location.origin) return
  // Không cache API calls
  if (url.pathname.startsWith("/api/")) return

  const isStaticAsset = url.pathname.startsWith("/_next/static/")

  if (isStaticAsset) {
    // Static assets: cache-first (content-hashed, immutable)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          if (res.ok) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {})
          }
          return res
        }).catch(() => Response.error())
      })
    )
    return
  }

  // Pages: network-first → cache → offline.html (static, không cần server)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && res.type === "basic") {
          caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {})
        }
        return res
      })
      .catch(() =>
        caches.match(e.request)
          .then(cached => cached || caches.match("/offline.html"))
      )
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
    }).catch(() => {})
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
