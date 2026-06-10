import webpush from "web-push"
import { prisma } from "./db"

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function sendPushToUser(userId: string, title: string, body: string, url = "/") {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  const payload = JSON.stringify({ title, body, url })

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err) => {
        // Xóa subscription hết hạn
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        }
      })
    )
  )
}

export async function sendPushToAll(title: string, body: string, url = "/") {
  const subs = await prisma.pushSubscription.findMany()
  const payload = JSON.stringify({ title, body, url })

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        }
      })
    )
  )
}
