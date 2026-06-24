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

  async setSupervisor(telegramUserId: string) {
    return prisma.member.update({
      where: { telegramUserId },
      data: { role: MemberRole.SUPERVISOR },
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
    // EARNED entries are auto-approved (supervisor records after the fact)
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

  async requestUsed(memberId: string, holidayDate: Date, holidayName: string, notes?: string) {
    return prisma.tabunganLibur.create({
      data: {
        memberId,
        type: TabunganType.USED,
        holidayDate,
        holidayName,
        notes,
        status: TabunganStatus.PENDING,
      },
    });
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

  async getPublicHolidays(year: number) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);
    return prisma.publicHoliday.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
  }

  async addPublicHoliday(date: Date, name: string, type: 'NATIONAL' | 'CUTI_BERSAMA') {
    return prisma.publicHoliday.upsert({
      where: { date },
      update: { name, type },
      create: { date, name, type },
    });
  }

  async getEntryById(id: string) {
    return prisma.tabunganLibur.findUnique({ where: { id }, include: { member: true } });
  }
}

export const tabunganService = new TabunganService();
