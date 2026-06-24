ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "finishedAt" TIMESTAMP(3);
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "gradedAt" TIMESTAMP(3);

-- Backfill: trận đã kết thúc coi như đã chấm (tránh block mới chấm lại) + đặt mốc finishedAt
UPDATE "Match" SET "finishedAt" = "kickoffAt" + interval '105 minutes' WHERE "status" = 'finished' AND "finishedAt" IS NULL;
UPDATE "Match" SET "gradedAt" = NOW() WHERE "status" = 'finished' AND "gradedAt" IS NULL;
