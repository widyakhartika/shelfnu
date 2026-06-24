-- CreateEnum
CREATE TYPE "TabunganType" AS ENUM ('EARNED', 'USED');
CREATE TYPE "TabunganStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "MemberRole" AS ENUM ('MEMBER', 'SUPERVISOR');

-- CreateTable members
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "fullName" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "members_telegramUserId_key" ON "members"("telegramUserId");

-- CreateTable tabungan_libur
CREATE TABLE "tabungan_libur" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "TabunganType" NOT NULL,
    "holidayDate" TIMESTAMP(3) NOT NULL,
    "holidayName" TEXT NOT NULL,
    "notes" TEXT,
    "status" "TabunganStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tabungan_libur_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tabungan_libur_memberId_idx" ON "tabungan_libur"("memberId");
CREATE INDEX "tabungan_libur_status_idx" ON "tabungan_libur"("status");
CREATE INDEX "tabungan_libur_holidayDate_idx" ON "tabungan_libur"("holidayDate");

-- CreateTable public_holidays
CREATE TABLE "public_holidays" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "public_holidays_date_key" ON "public_holidays"("date");

-- AddForeignKey
ALTER TABLE "tabungan_libur" ADD CONSTRAINT "tabungan_libur_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tabungan_libur" ADD CONSTRAINT "tabungan_libur_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
