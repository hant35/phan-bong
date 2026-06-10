// Sinh schema SQLite cho local dev TỪ schema.prisma (Postgres production).
// Không bao giờ sửa schema.prisma gốc — chỉ tạo prisma/schema.local.prisma (đã gitignore).
// Chạy lại mỗi khi models trong schema.prisma thay đổi để tránh lệch.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const src = readFileSync(join(root, "prisma", "schema.prisma"), "utf8")

// Thay nguyên block datasource (postgres + directUrl) bằng sqlite
const out = src.replace(
  /datasource\s+db\s*\{[\s\S]*?\}/,
  `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`
)

const dest = join(root, "prisma", "schema.local.prisma")
writeFileSync(dest, out)
console.log("✓ Đã sinh prisma/schema.local.prisma (SQLite) từ schema.prisma")
