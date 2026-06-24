import { prisma } from '../db/prisma';
import { LeaveType, LeaveStatus } from '@prisma/client';

function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export class LeaveService {

  async getOrCreateQuota(memberId: string, year: number) {
    return prisma.leaveQuota.upsert({
      where: { memberId_year: { memberId, year } },
      update: {},
      create: { memberId, year, total: 12 },
    });
  }

  async getUsedAnnual(memberId: string, year: number): Promise<number> {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year + 1}-01-01`);
    const result = await prisma.leaveRequest.aggregate({
      where: {
        memberId,
        type: LeaveType.ANNUAL,
        status: LeaveStatus.APPROVED,
        startDate: { gte: start, lt: end },
      },
      _sum: { days: true },
    });
    return result._sum.days ?? 0;
  }

  async getSisaCuti(memberId: string): Promise<{ total: number; used: number; sisa: number; year: number }> {
    const year = new Date().getFullYear();
    const quota = await this.getOrCreateQuota(memberId, year);
    const used = await this.getUsedAnnual(memberId, year);
    return { total: quota.total, used, sisa: quota.total - used, year };
  }

  async setQuota(memberId: string, year: number, total: number) {
    return prisma.leaveQuota.upsert({
      where: { memberId_year: { memberId, year } },
      update: { total },
      create: { memberId, year, total },
    });
  }

  async requestLeave(memberId: string, type: LeaveType, startDate: Date, endDate: Date, reason: string) {
    const days = type === LeaveType.SICK || type === LeaveType.PERMISSION
      ? countWeekdays(startDate, endDate)
      : countWeekdays(startDate, endDate);
    return prisma.leaveRequest.create({
      data: { memberId, type, startDate, endDate, days, reason, status: LeaveStatus.PENDING },
    });
  }

  async cancelLeave(id: string, memberId: string) {
    const req = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!req || req.memberId !== memberId || req.status !== 'PENDING') return null;
    return prisma.leaveRequest.update({ where: { id }, data: { status: LeaveStatus.CANCELLED } });
  }

  async getPendingLeave() {
    return prisma.leaveRequest.findMany({
      where: { status: LeaveStatus.PENDING },
      include: { member: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveLeave(id: string, supervisorId: string) {
    return prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.APPROVED, approvedById: supervisorId, approvedAt: new Date() },
      include: { member: true },
    });
  }

  async rejectLeave(id: string, supervisorId: string, reason: string) {
    return prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.REJECTED, approvedById: supervisorId, approvedAt: new Date(), rejectionReason: reason },
      include: { member: true },
    });
  }

  async getMyLeave(memberId: string, limit = 10) {
    return prisma.leaveRequest.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getMyPendingLeave(memberId: string) {
    return prisma.leaveRequest.findMany({
      where: { memberId, status: LeaveStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRekapLeave(year?: number) {
    const y = year ?? new Date().getFullYear();
    const start = new Date(`${y}-01-01`);
    const end = new Date(`${y + 1}-01-01`);

    const members = await prisma.member.findMany({
      include: {
        leaveRequests: {
          where: { startDate: { gte: start, lt: end }, status: LeaveStatus.APPROVED },
        },
        leaveQuotas: { where: { year: y } },
      },
    });

    return members.map((m) => {
      const annual = m.leaveRequests.filter((r) => r.type === 'ANNUAL').reduce((s, r) => s + r.days, 0);
      const sick = m.leaveRequests.filter((r) => r.type === 'SICK').reduce((s, r) => s + r.days, 0);
      const permission = m.leaveRequests.filter((r) => r.type === 'PERMISSION').reduce((s, r) => s + r.days, 0);
      const quota = m.leaveQuotas[0]?.total ?? 12;
      return { member: m, annual, sick, permission, quota, sisaCuti: quota - annual };
    });
  }

  async getLeaveById(id: string) {
    return prisma.leaveRequest.findUnique({ where: { id }, include: { member: true } });
  }
}

export const leaveService = new LeaveService();
