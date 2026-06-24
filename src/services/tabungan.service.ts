import { prisma } from '../db/prisma';
import { logger } from '../logger';
import { TabunganType, TabunganStatus, MemberRole } from '@prisma/client';

export class TabunganService {

  async registerMember(telegramUserId: string, telegramUsername: string | undefined, fullName: string) {
    return prisma.member.upsert({
      where: { telegramUserId },
      update: { telegramUsername, fullName },
      create: { telegramUserId, telegramUsername, fullName },
    });
  }

  async findMember(telegramUserId: string) {
    return prisma.member.findUnique({ where: { telegramUserId } });
  }

  async getMemberCount() {
    return prisma.member.count();
  }

  async setSupervisor(telegramUserId: string) {
    return prisma.member.update({
      where: { telegramUserId },
      data: { role: MemberRole.SUPERVISOR },
    });
  }

  async removeSupervisor(telegramUserId: string) {
    return prisma.member.update({
      where: { telegramUserId },
      data: { role: MemberRole.MEMBER },
    });
  }

  async getSupervisors() {
    return prisma.member.findMany({
      where: { role: MemberRole.SUPERVISOR },
    });
  }

  async getSaldo(memberId: string): Promise<number> {
    const earned = await prisma.tabunganLibur.count({
      where: { memberId, type: TabunganType.EARNED, status: TabunganStatus.APPROVED },
    });
    const used = await prisma.tabunganLibur.count({
      where: { memberId, type: TabunganType.USED, status: TabunganStatus.APPROVED },
    });
    return earned - used;
  }

  async recordEarned(memberId: string, holidayDate: Date, holidayName: string, notes?: string) {
    return prisma.tabunganLibur.create({
      data: {
        memberId,
        type: TabunganType.EARNED,
        holidayDate,
        holidayName,
        notes,
        status: TabunganStatus.APPROVED,
        approvedAt: new Date(),
      },
    });
  }

  async batchRecordEarned(memberIds: string[], holidayDate: Date, holidayName: string) {
    const entries = memberIds.map((memberId) => ({
      memberId,
      type: TabunganType.EARNED as const,
      holidayDate,
      holidayName,
      status: TabunganStatus.APPROVED as const,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }));
    return prisma.tabunganLibur.createMany({ data: entries });
  }

  async requestUsed(memberId: string, takeDate: Date, reason: string, notes?: string) {
    return prisma.tabunganLibur.create({
      data: {
        memberId,
        type: TabunganType.USED,
        holidayDate: takeDate,
        holidayName: reason,
        notes,
        status: TabunganStatus.PENDING,
      },
    });
  }

  async cancelRequest(entryId: string, memberId: string) {
    const entry = await prisma.tabunganLibur.findUnique({ where: { id: entryId } });
    if (!entry || entry.memberId !== memberId || entry.status !== 'PENDING') return null;
    return prisma.tabunganLibur.delete({ where: { id: entryId } });
  }

  async getPendingRequests() {
    return prisma.tabunganLibur.findMany({
      where: { type: TabunganType.USED, status: TabunganStatus.PENDING },
      include: { member: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveRequest(entryId: string, supervisorId: string) {
    return prisma.tabunganLibur.update({
      where: { id: entryId },
      data: { status: TabunganStatus.APPROVED, approvedById: supervisorId, approvedAt: new Date() },
      include: { member: true },
    });
  }

  async rejectRequest(entryId: string, supervisorId: string, reason: string) {
    return prisma.tabunganLibur.update({
      where: { id: entryId },
      data: { status: TabunganStatus.REJECTED, approvedById: supervisorId, approvedAt: new Date(), rejectionReason: reason },
      include: { member: true },
    });
  }

  async getRiwayat(memberId: string, limit = 10) {
    return prisma.tabunganLibur.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { approvedBy: true },
    });
  }

  async getMyPending(memberId: string) {
    return prisma.tabunganLibur.findMany({
      where: { memberId, type: TabunganType.USED, status: TabunganStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRekapAll() {
    const members = await prisma.member.findMany({
      include: {
        tabunganEntries: { where: { status: TabunganStatus.APPROVED } },
      },
    });
    return members.map((m) => {
      const earned = m.tabunganEntries.filter((e) => e.type === TabunganType.EARNED).length;
      const used = m.tabunganEntries.filter((e) => e.type === TabunganType.USED).length;
      return { member: m, earned, used, saldo: earned - used };
    });
  }

  async getAllMembers() {
    return prisma.member.findMany({ orderBy: { fullName: 'asc' } });
  }

  async getPublicHolidays(year: number) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year + 1}-01-01`);
    return prisma.publicHoliday.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    });
  }

  async getHolidayByDate(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return prisma.publicHoliday.findFirst({
      where: { date: { gte: start, lte: end } },
    });
  }

  async addPublicHoliday(date: Date, name: string, type: 'NATIONAL' | 'CUTI_BERSAMA') {
    return prisma.publicHoliday.upsert({
      where: { date },
      update: { name, type },
      create: { date, name, type },
    });
  }

  async deletePublicHoliday(id: string) {
    return prisma.publicHoliday.delete({ where: { id } });
  }

  async getUpcomingHolidays(limit = 10) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return prisma.publicHoliday.findMany({
      where: { date: { gte: now } },
      orderBy: { date: 'asc' },
      take: limit,
    });
  }

  async getEntryById(id: string) {
    return prisma.tabunganLibur.findUnique({ where: { id }, include: { member: true } });
  }
}

export const tabunganService = new TabunganService();
