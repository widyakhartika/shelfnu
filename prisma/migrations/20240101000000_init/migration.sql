-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'SUBMITTED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "asset_requests" (
    "id" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "assetName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cookieSession" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_requests_telegramUserId_idx" ON "asset_requests"("telegramUserId");

-- CreateIndex
CREATE INDEX "asset_requests_status_idx" ON "asset_requests"("status");
