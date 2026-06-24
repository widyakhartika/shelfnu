import { Bot } from 'grammy';
import { conversations } from '@grammyjs/conversations';
import { env } from '../config/env.config';
import { logger } from '../logger';
import { createSessionMiddleware } from './middleware/session';
import { registerHelpHandlers } from './handlers/help.handler';
import { registerAssetHandlers } from './handlers/asset.handler';
import { registerTabunganHandler } from './handlers/tabungan.handler';
import { AssetRequestService } from '../services/asset-request.service';
import type { BotContext } from '../types';

const assetService = new AssetRequestService();

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

  bot.use(createSessionMiddleware());
  bot.use(conversations());

  registerHelpHandlers(bot);
  registerAssetHandlers(bot);
  registerTabunganHandler(bot);

  bot.command('history', async (ctx) => {
    const userId = String(ctx.from?.id ?? '');
    if (!userId) return;
    const history = await assetService.getHistory(userId);
    if (history.length === 0) {
      await ctx.reply('Belum ada riwayat pengajuan aset.');
      return;
    }
    const lines = history.map((r, i) => {
      const date = r.createdAt.toLocaleDateString('id-ID');
      const icon = r.status === 'SUBMITTED' ? '✅' : r.status === 'FAILED' ? '❌' : '⏳';
      return `${i + 1}. ${icon} ${r.assetName} (x${r.quantity}) — ${r.urgency} — ${date}`;
    });
    await ctx.reply(`*Riwayat Pengajuan Aset:*\n\n${lines.join('\n')}`, {
      parse_mode: 'Markdown',
    });
  });

  bot.catch((err) => {
    logger.error('Grammy error', { message: err.message, stack: err.stack });
  });

  return bot;
}
