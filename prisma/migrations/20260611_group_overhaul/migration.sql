-- ── 1. GroupMember: thêm cột role ──────────────────────────────────────────
ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'member';

-- Đặt owner cho adminId của từng hội
UPDATE "GroupMember" gm
SET role = 'owner'
FROM "Group" g
WHERE gm."groupId" = g.id AND gm."userId" = g."adminId";

-- ── 2. GroupMatchConfig ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "GroupMatchConfig" (
    "id"               TEXT NOT NULL,
    "groupId"          TEXT NOT NULL,
    "matchId"          TEXT NOT NULL,
    "ahLine"           DOUBLE PRECISION,
    "ouLine"           DOUBLE PRECISION,
    "allowedBetTypes"  TEXT NOT NULL DEFAULT '["ah","ou","exact"]',
    "pointsMultiplier" INTEGER NOT NULL DEFAULT 1,
    "lockMinutes"      INTEGER NOT NULL DEFAULT 0,
    "blindMode"        BOOLEAN NOT NULL DEFAULT false,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy"        TEXT NOT NULL DEFAULT '',
    CONSTRAINT "GroupMatchConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GroupMatchConfig_groupId_matchId_key" ON "GroupMatchConfig"("groupId", "matchId");
ALTER TABLE "GroupMatchConfig"
    ADD CONSTRAINT "GroupMatchConfig_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "GroupMatchConfig_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 3. GroupSeason ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "GroupSeason" (
    "id"        TEXT NOT NULL,
    "groupId"   TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "snapshot"  TEXT NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt"   TIMESTAMP(3),
    CONSTRAINT "GroupSeason_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "GroupSeason"
    ADD CONSTRAINT "GroupSeason_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 4. Prediction.groupId ────────────────────────────────────────────────────
-- Bước 1: thêm cột nullable
ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

-- Bước 2: gán groupId = group đầu tiên user tham gia
UPDATE "Prediction" p
SET "groupId" = (
    SELECT gm."groupId"
    FROM "GroupMember" gm
    WHERE gm."userId" = p."userId"
    ORDER BY gm."joinedAt" ASC
    LIMIT 1
)
WHERE p."groupId" IS NULL;

-- Bước 3: xóa predictions không gán được group (user đã rời hết hội)
DELETE FROM "Prediction" WHERE "groupId" IS NULL;

-- Bước 4: đặt NOT NULL
ALTER TABLE "Prediction" ALTER COLUMN "groupId" SET NOT NULL;

-- Bước 5: xóa unique constraint cũ, tạo mới
ALTER TABLE "Prediction" DROP CONSTRAINT IF EXISTS "Prediction_userId_matchId_key";
DROP INDEX IF EXISTS "Prediction_userId_matchId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Prediction_userId_matchId_groupId_key" ON "Prediction"("userId", "matchId", "groupId");

-- Bước 6: foreign key
ALTER TABLE "Prediction"
    ADD CONSTRAINT "Prediction_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
