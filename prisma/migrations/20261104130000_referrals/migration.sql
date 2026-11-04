-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailNormalized" TEXT;
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskReasons" JSONB,
    "history" JSONB,
    "appealText" TEXT,
    "appealAt" DATETIME,
    "qualifiedAt" DATETIME,
    "rewardedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VipCredit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "referralId" TEXT,
    "days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VipCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VipCredit_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "installHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_refereeId_key" ON "Referral"("refereeId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status");

-- CreateIndex
CREATE INDEX "Referral_status_createdAt_idx" ON "Referral"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VipCredit_idempotencyKey_key" ON "VipCredit"("idempotencyKey");

-- CreateIndex
CREATE INDEX "VipCredit_userId_status_endsAt_idx" ON "VipCredit"("userId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "DeviceRegistration_installHash_idx" ON "DeviceRegistration"("installHash");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRegistration_installHash_userId_key" ON "DeviceRegistration"("installHash", "userId");

-- CreateIndex
CREATE INDEX "RiskSignal_ipHash_kind_createdAt_idx" ON "RiskSignal"("ipHash", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "RiskSignal_createdAt_idx" ON "RiskSignal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_emailNormalized_idx" ON "User"("emailNormalized");

