import { Bot } from 'grammy';
import type { BotContext } from '../../types';

export function registerHelpHandlers(bot: Bot<BotContext>) {
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `*Selamat datang di DCSO Bot!*\n\n` +
        `Bot ini membantu tim DCSO mengajukan aset dan mengelola tabungan libur.\n\n` +
        `*Pengajuan Aset:*\n` +
        `/asset — Buat pengajuan aset baru\n` +
        `/history — Lihat riwayat pengajuan\n\n` +
        `*Tabungan Libur:*\n` +
        `/daftar — Daftar sebagai anggota tim\n` +
        `/tabungan — Lihat saldo tabungan libur\n` +
        `/catat\\_libur — Catat masuk di hari libur\n` +
        `/ambil\\_libur — Request ambil tabungan libur\n` +
        `/batal\\_libur — Batalkan request pending\n` +
        `/hari\\_libur — Lihat daftar hari libur nasional\n\n` +
        `*Supervisor:*\n` +
        `/pending\\_libur — Approve/reject request\n` +
        `/rekap\\_tabungan — Rekap tabungan seluruh tim\n` +
        `/batch\\_catat — Catat masuk libur banyak anggota\n` +
        `/tambah\\_libur — Tambah data hari libur nasional\n` +
        `/set\\_supervisor — Angkat supervisor baru\n\n` +
        `/help — Bantuan`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      `*DCSO Bot — Bantuan*\n\n` +
        `*Pengajuan Aset (iAssets):*\n` +
        `/asset — Wizard pengajuan aset baru\n` +
        `/history — Riwayat 10 pengajuan terakhir\n\n` +
        `*Tabungan Libur — Semua Anggota:*\n` +
        `/daftar — Daftar nama ke sistem\n` +
        `/tabungan — Lihat saldo & riwayat\n` +
        `/catat\\_libur — Catat masuk di hari libur (+1 saldo)\n` +
        `/ambil\\_libur — Request ambil libur (perlu approval)\n` +
        `/batal\\_libur — Batalkan request yang masih pending\n` +
        `/hari\\_libur — Lihat daftar hari libur nasional\n\n` +
        `*Tabungan Libur — Supervisor Only:*\n` +
        `/pending\\_libur — Lihat & proses request pending\n` +
        `/rekap\\_tabungan — Rekap saldo seluruh tim\n` +
        `/batch\\_catat — Catat banyak anggota masuk sekaligus\n` +
        `/tambah\\_libur — Tambah/update hari libur nasional\n` +
        `/set\\_supervisor — Angkat supervisor baru\n\n` +
        `Hubungi admin jika ada masalah.`,
      { parse_mode: 'Markdown' }
    );
  });
}
