import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { cookies } from "next/headers"

export async function GET() {
  const state = randomBytes(16).toString("hex")
  const jar = await cookies()
  jar.set("oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" })

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
