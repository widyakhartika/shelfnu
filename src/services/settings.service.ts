import { prisma } from '../db/prisma';
import { logger } from '../logger';

export class SettingsService {
  async getSettings() {
    return prisma.settings.findFirst({ orderBy: { updatedAt: 'desc' } });
  }

  async upsertSettings(organizationId: string, cookieSession: string) {
    const existing = await this.getSettings();
    if (existing) {
      return prisma.settings.update({
        where: { id: existing.id },
        data: { organizationId, cookieSession },
      });
    }
    return prisma.settings.create({ data: { organizationId, cookieSession } });
  }
}
