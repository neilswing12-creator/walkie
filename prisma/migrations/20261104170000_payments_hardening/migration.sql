-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "providerEventAt" DATETIME;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN "paymongoAmount" INTEGER;

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "paymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_providerRef_key" ON "PaymentOrder"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_paymentId_key" ON "PaymentOrder"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_status_idx" ON "PaymentOrder"("userId", "status");

