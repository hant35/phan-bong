-- Add statusText to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusText" TEXT;
