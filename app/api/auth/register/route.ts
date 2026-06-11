import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { createSession } from "@/lib/auth"
import { INITIAL_USER_POINTS } from "@/lib/hope-star"

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json()
  if (!email || !password || !name) return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: "Mật khẩu tối thiểu 6 ký tự" }, { status: 400 })

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (exists) return NextResponse.json({ error: "Email đã đăng ký" }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 10)
  const avatar = name.split(" ").map((s: string) => s[0]).join("").slice(0, 3).toUpperCase()
  const user = await prisma.user.create({
    data: { email: email.toLowerCase().trim(), passwordHash, name, avatar, totalPoints: INITIAL_USER_POINTS },
  })

  await createSession(user.id)
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } })
}
