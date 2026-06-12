import { prisma } from "@/lib/db"
import { buildPushPayload } from "@/lib/push-payload"
import { sendPushToAll, sendPushToUser, type PushDeliveryResult } from "@/lib/push"
import { shouldSendPushNow } from "@/lib/quiet-hours"

export type NotificationType =
  | "kickoff_soon"
  | "kickoff"
  | "goal"
  | "result"
  | "streak"
  | "overtaken"
  | "badge"
  | "comment"
  | "prediction"
  | "join"
  | "config"
  | "admin"

export type NotifyOptions = {
  userId: string
  type: NotificationType | string
  title: string
  body: string
  url?: string
  matchId?: string | null
  push?: boolean
}

const EMPTY_PUSH: PushDeliveryResult = {
  delivered: 0, failed: 0, expired: 0, total: 0, configured: true,
}

/** Ghi inbox in-app và gửi Web Push (mặc định bật push). */
export async function notifyUser(opts: NotifyOptions): Promise<PushDeliveryResult> {
  await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      matchId: opts.matchId ?? undefined,
    },
  })

  if (opts.push === false) return EMPTY_PUSH

  const canPush = await shouldSendPushNow(opts.userId)
  if (!canPush) return { ...EMPTY_PUSH, debug: "quiet_hours" }

  const payload = buildPushPayload(opts)
  return sendPushToUser(opts.userId, payload)
}

export async function notifyUsers(
  userIds: string[],
  opts: Omit<NotifyOptions, "userId">,
): Promise<void> {
  const unique = [...new Set(userIds)]
  await Promise.allSettled(unique.map(userId => notifyUser({ ...opts, userId })))
}

/** Broadcast admin — ghi inbox cho mọi user + push. */
export async function notifyAll(
  opts: Omit<NotifyOptions, "userId">,
): Promise<PushDeliveryResult> {
  const users = await prisma.user.findMany({ select: { id: true } })
  if (users.length > 0) {
    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        matchId: opts.matchId ?? undefined,
      })),
    })
  }
  if (opts.push === false) {
    return { delivered: 0, failed: 0, expired: 0, total: 0, configured: true }
  }
  const payload = buildPushPayload({ ...opts, url: opts.url ?? "/" })
  return sendPushToAll(payload)
}
