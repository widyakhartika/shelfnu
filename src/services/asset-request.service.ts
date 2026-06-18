import { IAssetsClient } from '../clients/iassets.client';
import { prisma } from '../db/prisma';
import { SettingsService } from './settings.service';
import { logger } from '../logger';
import type { AssetRequestData } from '../types';

export class AssetRequestService {
  private readonly settingsService = new SettingsService();

  async submit(
    telegramUserId: string,
    telegramUsername: string | undefined,
    data: AssetRequestData
  ) {
    const settings = await this.settingsService.getSettings();
    const client = new IAssetsClient(settings?.cookieSession);

    const record = await prisma.assetRequest.create({
      data: {
        telegramUserId,
        telegramUsername,
        assetName: data.assetName,
        categoryId: data.categoryId,
        quantity: data.quantity,
        urgency: data.urgency as any,
        justification: data.justification,
        status: 'PENDING',
      },
    });

    logger.info('Asset request created', { id: record.id, telegramUserId });

    const result = await client.submitRequest(data);

    await prisma.assetRequest.update({
      where: { id: record.id },
      data: {
        status: result.success ? 'SUBMITTED' : 'FAILED',
        errorMessage: result.error,
      },
    });

    if (result.success) {
      logger.info('Asset request submitted successfully', { id: record.id });
    } else {
      logger.error('Asset request failed', { id: record.id, error: result.error });
    }

    return { record, result };
  }

  async getHistory(telegramUserId: string, limit = 10) {
    return prisma.assetRequest.findMany({
      where: { telegramUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
