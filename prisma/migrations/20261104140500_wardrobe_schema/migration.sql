-- CreateTable
CREATE TABLE "SavedLook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedLook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("activePetId", "activityLevel", "activityVisibility", "allowFriendRequests", "bio", "dailyActiveMinGoal", "dailyDistanceGoalM", "dailyStepGoal", "fitnessGoals", "heightCm", "leaderboardOptIn", "notifyDailyReminder", "notifyEmail", "notifyFriends", "notifyMissions", "notifyPets", "notifyPush", "onboardedAt", "preferredActivity", "profileVisibility", "reminderHour", "shareRoutes", "units", "userId", "weightKg") SELECT "activePetId", "activityLevel", "activityVisibility", "allowFriendRequests", "bio", "dailyActiveMinGoal", "dailyDistanceGoalM", "dailyStepGoal", "fitnessGoals", "heightCm", "leaderboardOptIn", "notifyDailyReminder", "notifyEmail", "notifyFriends", "notifyMissions", "notifyPets", "notifyPush", "onboardedAt", "preferredActivity", "profileVisibility", "reminderHour", "shareRoutes", "units", "userId", "weightKg" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SavedLook_userId_idx" ON "SavedLook"("userId");

