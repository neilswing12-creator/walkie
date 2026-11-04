
-- AlterTable
ALTER TABLE "ChallengeParticipant" ADD COLUMN "team" TEXT;

-- CreateTable
CREATE TABLE "LeaderboardScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "board" TEXT NOT NULL,
    "value" REAL NOT NULL DEFAULT 0,
    "flags" JSONB,
    "prevRank" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaderboardScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaderboardResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "period" TEXT NOT NULL,
    "board" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER,
    "score" REAL NOT NULL,
    "tier" TEXT,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardItem" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaderboardResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaderboardDisqualification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "period" TEXT,
    "reason" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liftedAt" DATETIME,
    CONSTRAINT "LeaderboardDisqualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaderboardDispute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "disqualificationId" TEXT,
    "period" TEXT,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "resolvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "LeaderboardDispute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeaderboardDispute_disqualificationId_fkey" FOREIGN KEY ("disqualificationId") REFERENCES "LeaderboardDisqualification" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Duel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "winnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Duel_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Duel_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cheer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cheer_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cheer_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'WEEKLY',
    "community" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "rewardCoins" INTEGER NOT NULL DEFAULT 100,
    "rewardXp" INTEGER NOT NULL DEFAULT 50,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxParticipants" INTEGER,
    "teamMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Challenge" ("community", "createdAt", "description", "enabled", "endsAt", "id", "key", "kind", "maxParticipants", "period", "premium", "rewardCoins", "rewardXp", "startsAt", "target", "title") SELECT "community", "createdAt", "description", "enabled", "endsAt", "id", "key", "kind", "maxParticipants", "period", "premium", "rewardCoins", "rewardXp", "startsAt", "target", "title" FROM "Challenge";
DROP TABLE "Challenge";
ALTER TABLE "new_Challenge" RENAME TO "Challenge";
CREATE UNIQUE INDEX "Challenge_key_key" ON "Challenge"("key");
CREATE TABLE "new_Profile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "bio" TEXT,
    "weightKg" REAL,
    "heightCm" REAL,
    "units" TEXT NOT NULL DEFAULT 'metric',
    "dailyStepGoal" INTEGER NOT NULL DEFAULT 6000,
    "dailyDistanceGoalM" INTEGER NOT NULL DEFAULT 3000,
    "dailyActiveMinGoal" INTEGER NOT NULL DEFAULT 30,
    "activePetId" TEXT,
    "profileVisibility" TEXT NOT NULL DEFAULT 'FRIENDS',
    "activityVisibility" TEXT NOT NULL DEFAULT 'FRIENDS',
    "shareRoutes" BOOLEAN NOT NULL DEFAULT false,
    "leaderboardOptIn" BOOLEAN NOT NULL DEFAULT false,
    "allowFriendRequests" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailyReminder" BOOLEAN NOT NULL DEFAULT false,
    "notifyMissions" BOOLEAN NOT NULL DEFAULT true,
    "notifyPets" BOOLEAN NOT NULL DEFAULT true,
    "notifyFriends" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "notifyPush" BOOLEAN NOT NULL DEFAULT false,
    "reminderHour" INTEGER NOT NULL DEFAULT 18,
    "onboardedAt" DATETIME,
    "preferredActivity" TEXT,
    "fitnessGoals" JSONB,
    "activityLevel" TEXT,
    "walkieLook" TEXT NOT NULL DEFAULT 'classic',
    "walkieFur" TEXT NOT NULL DEFAULT 'classic',
    "publicName" TEXT,
    "country" TEXT,
    "community" TEXT,
    "showPhotoOnBoards" BOOLEAN NOT NULL DEFAULT false,
    "notifyCompetition" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("activePetId", "activityLevel", "activityVisibility", "allowFriendRequests", "bio", "dailyActiveMinGoal", "dailyDistanceGoalM", "dailyStepGoal", "fitnessGoals", "heightCm", "leaderboardOptIn", "notifyDailyReminder", "notifyEmail", "notifyFriends", "notifyMissions", "notifyPets", "notifyPush", "onboardedAt", "preferredActivity", "profileVisibility", "reminderHour", "shareRoutes", "units", "userId", "walkieFur", "walkieLook", "weightKg") SELECT "activePetId", "activityLevel", "activityVisibility", "allowFriendRequests", "bio", "dailyActiveMinGoal", "dailyDistanceGoalM", "dailyStepGoal", "fitnessGoals", "heightCm", "leaderboardOptIn", "notifyDailyReminder", "notifyEmail", "notifyFriends", "notifyMissions", "notifyPets", "notifyPush", "onboardedAt", "preferredActivity", "profileVisibility", "reminderHour", "shareRoutes", "units", "userId", "walkieFur", "walkieLook", "weightKg" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LeaderboardScore_period_board_value_idx" ON "LeaderboardScore"("period", "board", "value");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardScore_userId_period_board_key" ON "LeaderboardScore"("userId", "period", "board");

-- CreateIndex
CREATE INDEX "LeaderboardResult_period_board_rank_idx" ON "LeaderboardResult"("period", "board", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardResult_period_board_userId_key" ON "LeaderboardResult"("period", "board", "userId");

-- CreateIndex
CREATE INDEX "LeaderboardDisqualification_userId_idx" ON "LeaderboardDisqualification"("userId");

-- CreateIndex
CREATE INDEX "Duel_challengerId_idx" ON "Duel"("challengerId");

-- CreateIndex
CREATE INDEX "Duel_opponentId_idx" ON "Duel"("opponentId");

-- CreateIndex
CREATE UNIQUE INDEX "Cheer_fromId_toId_day_key" ON "Cheer"("fromId", "toId", "day");

