import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { createSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: "Thiếu email/mật khẩu" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user) return NextResponse.json({ error: "Email không tồn tại" }, { status: 401 })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 })

  await createSession(user.id)
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } })
}
