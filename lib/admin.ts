import { getCurrentUser } from "./auth"

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== "admin") return null
  return user
}
