-- AlterTable
ALTER TABLE "User" ADD COLUMN "referredById" TEXT;

-- AlterTable
ALTER TABLE "UserAchievement" ADD COLUMN "rewardTxId" TEXT;
ALTER TABLE "UserAchievement" ADD COLUMN "seenAt" DATETIME;
ALTER TABLE "UserAchievement" ADD COLUMN "shareId" TEXT;

-- CreateTable
CREATE TABLE "AchievementProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AchievementProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AchievementProgress_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityTypeConfig" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "gps" BOOLEAN NOT NULL DEFAULT true,
    "rewardRate" REAL NOT NULL,
    "met" REAL NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ActivitySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" DATETIME,
    "pausedMs" INTEGER NOT NULL DEFAULT 0,
    "goal" JSONB,
    "finishedAt" DATETIME,
    "activityId" TEXT,
    CONSTRAINT "ActivitySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'FITNESS',
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "kind" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "rewardCoins" INTEGER NOT NULL DEFAULT 50,
    "rewardXp" INTEGER NOT NULL DEFAULT 25,
    "rewardItemKey" TEXT,
    "rewardItemQty" INTEGER NOT NULL DEFAULT 1,
    "icon" TEXT NOT NULL DEFAULT 'trophy',
    "art" JSONB,
    "imageUrl" TEXT,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Achievement" ("description", "enabled", "icon", "id", "key", "kind", "rewardCoins", "rewardXp", "sort", "target", "title") SELECT "description", "enabled", "icon", "id", "key", "kind", "rewardCoins", "rewardXp", "sort", "target", "title" FROM "Achievement";
DROP TABLE "Achievement";
ALTER TABLE "new_Achievement" RENAME TO "Achievement";
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");
CREATE INDEX "Achievement_category_enabled_idx" ON "Achievement"("category", "enabled");
CREATE TABLE "new_Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "elapsedSec" INTEGER NOT NULL,
    "distanceM" REAL NOT NULL DEFAULT 0,
    "elevationGainM" REAL,
    "avgPaceSecKm" REAL,
    "maxSpeedMps" REAL,
    "calories" INTEGER NOT NULL DEFAULT 0,
    "estimatedSteps" INTEGER,
    "splits" JSONB,
    "title" TEXT,
    "avgSpeedMps" REAL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "records" JSONB,
    "rewardTxId" TEXT,
    "sessionId" TEXT,
    "shareId" TEXT,
    "shareOptions" JSONB,
    "deletedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "flagReason" TEXT,
    "coinsAwarded" INTEGER NOT NULL DEFAULT 0,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Activity" ("avgPaceSecKm", "calories", "clientId", "coinsAwarded", "createdAt", "distanceM", "durationSec", "elapsedSec", "elevationGainM", "endedAt", "estimatedSteps", "flagReason", "id", "maxSpeedMps", "note", "source", "splits", "startedAt", "status", "type", "userId", "xpAwarded") SELECT "avgPaceSecKm", "calories", "clientId", "coinsAwarded", "createdAt", "distanceM", "durationSec", "elapsedSec", "elevationGainM", "endedAt", "estimatedSteps", "flagReason", "id", "maxSpeedMps", "note", "source", "splits", "startedAt", "status", "type", "userId", "xpAwarded" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE UNIQUE INDEX "Activity_sessionId_key" ON "Activity"("sessionId");
CREATE UNIQUE INDEX "Activity_shareId_key" ON "Activity"("shareId");
CREATE INDEX "Activity_userId_startedAt_idx" ON "Activity"("userId", "startedAt");
CREATE INDEX "Activity_startedAt_idx" ON "Activity"("startedAt");
CREATE UNIQUE INDEX "Activity_userId_clientId_key" ON "Activity"("userId", "clientId");
CREATE TABLE "new_DailySummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "steps" INTEGER NOT NULL DEFAULT 0,
    "stepsSource" TEXT,
    "walkDistanceM" REAL NOT NULL DEFAULT 0,
    "runDistanceM" REAL NOT NULL DEFAULT 0,
    "bikeDistanceM" REAL NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "activeMinutes" INTEGER NOT NULL DEFAULT 0,
    "calories" INTEGER NOT NULL DEFAULT 0,
    "activities" INTEGER NOT NULL DEFAULT 0,
    "goalMet" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DailySummary" ("activeMinutes", "activities", "calories", "date", "goalMet", "id", "runDistanceM", "steps", "stepsSource", "updatedAt", "userId", "walkDistanceM") SELECT "activeMinutes", "activities", "calories", "date", "goalMet", "id", "runDistanceM", "steps", "stepsSource", "updatedAt", "userId", "walkDistanceM" FROM "DailySummary";
DROP TABLE "DailySummary";
ALTER TABLE "new_DailySummary" RENAME TO "DailySummary";
CREATE INDEX "DailySummary_date_idx" ON "DailySummary"("date");
CREATE UNIQUE INDEX "DailySummary_userId_date_key" ON "DailySummary"("userId", "date");
CREATE TABLE "new_LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LedgerEntry" ("coins", "createdAt", "id", "idempotencyKey", "meta", "reason", "refId", "refType", "userId", "xp") SELECT "coins", "createdAt", "id", "idempotencyKey", "meta", "reason", "refId", "refType", "userId", "xp" FROM "LedgerEntry";
DROP TABLE "LedgerEntry";
ALTER TABLE "new_LedgerEntry" RENAME TO "LedgerEntry";
CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");
CREATE INDEX "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId", "createdAt");
CREATE INDEX "LedgerEntry_reason_createdAt_idx" ON "LedgerEntry"("reason", "createdAt");
CREATE TABLE "new_Wallet" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "lifetimeCoins" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streakFreezes" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Wallet" ("coins", "level", "lifetimeCoins", "streakFreezes", "updatedAt", "userId", "xp") SELECT "coins", "level", "lifetimeCoins", "streakFreezes", "updatedAt", "userId", "xp" FROM "Wallet";
DROP TABLE "Wallet";
ALTER TABLE "new_Wallet" RENAME TO "Wallet";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AchievementProgress_userId_achievementId_key" ON "AchievementProgress"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "ActivitySession_userId_status_idx" ON "ActivitySession"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_shareId_key" ON "UserAchievement"("shareId");

-- CreateIndex
CREATE INDEX "UserAchievement_achievementId_idx" ON "UserAchievement"("achievementId");

