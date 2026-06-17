-- AlterTable: thêm cột truy vết khi chấm điểm
ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "gradedAt" TIMESTAMP(3);
ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "gradedAhLine" DOUBLE PRECISION;
ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "gradedOuLine" DOUBLE PRECISION;
