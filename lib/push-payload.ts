import type { NotificationType } from "@/lib/notify"

export type PushAction = { action: string; title: string }

export type PushPayload = {
  title: string
  body: string
  url: string
  type?: string
  tag?: string
  requireInteraction?: boolean
  actions?: PushAction[]
  pickUrl?: string
}

export function buildPushPayload(opts: {
  type: NotificationType | string
  title: string
  body: string
  url?: string
  matchId?: string | null
}): PushPayload {
  const url = opts.url ?? "/"
  const tag = opts.matchId ? `${opts.type}:${opts.matchId}` : opts.type
  const requireInteraction = opts.type === "kickoff" || opts.type === "kickoff_soon"

  const actions: PushAction[] = []
  if (opts.type === "kickoff_soon" && opts.matchId) {
    actions.push(
      { action: "view", title: "Xem trận" },
      { action: "pick", title: "Đặt kèo" },
    )
  } else if (opts.matchId) {
    actions.push({ action: "view", title: "Xem trận" })
  }

  return {
    title: opts.title,
    body: opts.body,
    url,
    type: opts.type,
    tag,
    requireInteraction,
    actions: actions.length > 0 ? actions : undefined,
    pickUrl: opts.matchId ? `/matches/${opts.matchId}` : undefined,
  }
}
