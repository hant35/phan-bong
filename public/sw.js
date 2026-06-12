const CACHE = "phanbong-v5"
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
  if (url.pathname.startsWith("/api/")) return

  const isStaticAsset = url.pathname.startsWith("/_next/static/")

  if (isStaticAsset) {
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

function resolveNotificationUrl(data, action) {
  if (action === "pick" && data.pickUrl) return data.pickUrl
  if (action === "view" && data.url) return data.url
  return data.url || "/"
}

function navigateClient(url) {
  const absolute = new URL(url, self.location.origin).href
  return clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const client of list) {
      if (client.url.startsWith(self.location.origin)) {
        client.postMessage({ type: "navigate", url })
        return client.focus()
      }
    }
    if (clients.openWindow) return clients.openWindow(absolute)
  })
}

// ── Push Notifications ──
self.addEventListener("push", e => {
  let data = {
    title: "Phán Bóng ⚽",
    body: "Có thông báo mới!",
    url: "/",
    tag: "default",
    type: "admin",
    requireInteraction: false,
    actions: [],
    pickUrl: null,
  }
  if (e.data) {
    try { data = { ...data, ...JSON.parse(e.data.text()) } } catch {}
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag || data.type || "phanbong",
    renotify: true,
    requireInteraction: !!data.requireInteraction,
    data: {
      url: data.url,
      pickUrl: data.pickUrl,
      type: data.type,
    },
    vibrate: [200, 100, 200],
  }

  if (Array.isArray(data.actions) && data.actions.length > 0) {
    options.actions = data.actions.slice(0, 2)
  }

  e.waitUntil(
    self.registration.showNotification(data.title, options).catch(() => {})
  )
})

self.addEventListener("notificationclick", e => {
  e.notification.close()
  const data = e.notification.data || {}
  const action = e.action || "default"
  const url = resolveNotificationUrl(data, action === "default" ? null : action)

  e.waitUntil(navigateClient(url))
})
