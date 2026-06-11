/** Chuẩn hóa VAPID key về dạng URL-safe Base64 (không padding) mà web-push yêu cầu. */
export function normalizeVapidKey(key: string): string {
  let k = key.trim().replace(/^["']|["']$/g, "")
  // PEM / multiline — không hỗ trợ
  if (k.includes("BEGIN")) {
    throw new Error("VAPID key không được là PEM; dùng output của web-push generateVAPIDKeys()")
  }
  // Bỏ padding và chuyển standard Base64 → Base64url
  k = k.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_")
  if (!/^[A-Za-z0-9\-_]+$/.test(k)) {
    throw new Error("VAPID key chứa ký tự không hợp lệ sau khi chuẩn hóa")
  }
  return k
}
