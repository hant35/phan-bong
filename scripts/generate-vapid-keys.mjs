#!/usr/bin/env node
import webpush from "web-push"

const keys = webpush.generateVAPIDKeys()
console.log("Thêm vào .env và Vercel Environment Variables:\n")
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`)
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`)
console.log(`VAPID_EMAIL="mailto:admin@phanbong.vn"`)
