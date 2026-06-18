import { Bot } from 'grammy';
import type { BotContext } from '../../types';

export function registerHelpHandlers(bot: Bot<BotContext>) {
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `👋 *Selamat datang di DCSO Bot!*\n\n` +
        `Bot ini membantu Anda mengajukan aset melalui iAssets.\n\n` +
        `*Perintah yang tersedia:*\n` +
        `/asset — Buat pengajuan aset baru\n` +
        `/history — Lihat riwayat pengajuan\n` +
        `/help — Bantuan`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      `*DCSO Bot — Bantuan*\n\n` +
        `/asset — Wizard pengajuan aset baru\n` +
        `/history — Riwayat 10 pengajuan terakhir\n\n` +
        `Hubungi admin jika ada masalah.`,
      { parse_mode: 'Markdown' }
    );
  });
}
