import { prisma } from '../db/prisma';
import { ShiftType } from '@prisma/client';

export class ShiftService {

  async setShift(memberId: string, date: Date, shift: ShiftType, notes?: string) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return prisma.shiftSchedule.upsert({
      where: { memberId_date: { memberId, date: d } },
      update: { shift, notes },
      create: { memberId, date: d, shift, notes },
    });
  }

  async setShiftBatch(memberId: string, dates: Date[], shift: ShiftType) {
    const ops = dates.map((date) => {
      const d = new Date(date);
      d.setHours(12, 0, 0, 0);
      return prisma.shiftSchedule.upsert({
        where: { memberId_date: { memberId, date: d } },
        update: { shift },
        create: { memberId, date: d, shift },
      });
    });
    return Promise.all(ops);
  }

  async getMySchedule(memberId: string, startDate: Date, endDate: Date) {
    return prisma.shiftSchedule.findMany({
      where: { memberId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });
  }

  async getTeamSchedule(startDate: Date, endDate: Date) {
    return prisma.shiftSchedule.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { member: true },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    });
  }

  async getTodaySchedule() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return prisma.shiftSchedule.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { member: true },
      orderBy: { shift: 'asc' },
    });
  }

  async getMemberTodayShift(memberId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return prisma.shiftSchedule.findFirst({
      where: { memberId, date: { gte: today, lt: tomorrow } },
    });
  }
}

export const shiftService = new ShiftService();
