import { Bot } from 'grammy';
import type { BotContext } from '../../types';

export function registerHelpHandlers(bot: Bot<BotContext>) {
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `👋 *Selamat datang di DCSO Bot!*\n\n` +
        `Bot ini membantu Anda mengajukan aset melalui iAssets dan mengelola tabungan libur.\n\n` +
        `*Perintah yang tersedia:*\n` +
        `/asset — Buat pengajuan aset baru\n` +
        `/history — Lihat riwayat pengajuan\n` +
        `/daftar — Daftar sebagai anggota tim\n` +
        `/tabungan — Lihat saldo tabungan libur\n` +
        `/catat_libur — Catat masuk di hari libur (tambah tabungan)\n` +
        `/ambil_libur — Request ambil tabungan libur\n` +
        `/pending_libur — Lihat request pending (atasan)\n` +
        `/rekap_tabungan — Rekap tabungan seluruh tim (atasan)\n` +
        `/help — Bantuan`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      `*DCSO Bot — Bantuan*\n\n` +
        `*Pengajuan Aset:*\n` +
        `/asset — Wizard pengajuan aset baru\n` +
        `/history — Riwayat 10 pengajuan terakhir\n\n` +
        `*Tabungan Libur:*\n` +
        `/daftar — Daftar sebagai anggota tim\n` +
        `/tabungan — Lihat saldo tabungan libur\n` +
        `/catat_libur — Catat masuk di hari libur (tambah tabungan)\n` +
        `/ambil_libur — Request ambil tabungan libur\n` +
        `/pending_libur — Lihat request pending (atasan)\n` +
        `/rekap_tabungan — Rekap tabungan seluruh tim (atasan)\n\n` +
        `Hubungi admin jika ada masalah.`,
      { parse_mode: 'Markdown' }
    );
  });
}
