-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PERMISSION', 'OTHER');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "ShiftType" AS ENUM ('PAGI', 'SIANG', 'MALAM', 'OFF');

-- CreateTable leave_quotas
CREATE TABLE "leave_quotas" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 12,
    CONSTRAINT "leave_quotas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leave_quotas_memberId_year_key" ON "leave_quotas"("memberId", "year");

-- CreateTable leave_requests
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "leave_requests_memberId_idx" ON "leave_requests"("memberId");
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");
CREATE INDEX "leave_requests_startDate_idx" ON "leave_requests"("startDate");

-- CreateTable shift_schedules
CREATE TABLE "shift_schedules" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shift_schedules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shift_schedules_memberId_date_key" ON "shift_schedules"("memberId", "date");
CREATE INDEX "shift_schedules_memberId_idx" ON "shift_schedules"("memberId");
CREATE INDEX "shift_schedules_date_idx" ON "shift_schedules"("date");

-- AddForeignKey
ALTER TABLE "leave_quotas" ADD CONSTRAINT "leave_quotas_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
