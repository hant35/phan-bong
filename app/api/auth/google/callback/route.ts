import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { createSession } from "@/lib/auth"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!
const ADMIN_EMAIL = "nguyenha3535@gmail.com"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  const jar = await cookies()
  const savedState = jar.get("oauth_state")?.value
  jar.delete("oauth_state")

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${BASE_URL}/login?error=invalid_state`)
  }

  try {
    // Đổi code lấy access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${BASE_URL}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenRes.ok) return NextResponse.redirect(`${BASE_URL}/login?error=token_failed`)
    const { access_token } = await tokenRes.json()

    // Lấy thông tin user từ Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    if (!profileRes.ok) return NextResponse.redirect(`${BASE_URL}/login?error=profile_failed`)

    const profile = await profileRes.json() as {
      id: string; email: string; name: string; picture?: string
    }

    // Tìm hoặc tạo user
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.id }, { email: profile.email }] },
    })

    const isAdmin = profile.email === ADMIN_EMAIL

    if (user) {
      const updates: Record<string, unknown> = {}
      if (!user.googleId) updates.googleId = profile.id
      if (isAdmin && user.role !== "admin") updates.role = "admin"
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({ where: { id: user.id }, data: updates })
      }
    } else {
      const initials = profile.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.id,
          avatar: initials,
          passwordHash: "",
          role: isAdmin ? "admin" : "user",
        },
      })
    }

    await createSession(user.id)
    return NextResponse.redirect(`${BASE_URL}/`)
  } catch {
    return NextResponse.redirect(`${BASE_URL}/login?error=server_error`)
  }
}
