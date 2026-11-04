
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "providerEventAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "paymongoAmount" INTEGER;

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_providerRef_key" ON "PaymentOrder"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_paymentId_key" ON "PaymentOrder"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_status_idx" ON "PaymentOrder"("userId", "status");

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

