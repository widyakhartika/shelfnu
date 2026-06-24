import { Bot } from 'grammy';
import type { BotContext } from '../../types';

export function registerHelpHandlers(bot: Bot<BotContext>) {
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `*Selamat datang di DCSO Bot!*\n\n` +
        `Bot internal tim DCSO untuk pengajuan aset, cuti, izin, dan jadwal shift.\n\n` +
        `*Umum:*\n` +
        `/daftar — Daftar sebagai anggota tim\n\n` +
        `*Pengajuan Aset:*\n` +
        `/asset — Buat pengajuan aset ke iAssets\n` +
        `/history — Riwayat pengajuan aset\n\n` +
        `*Cuti & Izin:*\n` +
        `/cuti — Request cuti tahunan / sakit / izin\n` +
        `/sisa\\_cuti — Lihat saldo & riwayat cuti\n` +
        `/batal\\_cuti — Batalkan request cuti pending\n\n` +
        `*Tabungan Libur:*\n` +
        `/tabungan — Lihat saldo tabungan libur\n` +
        `/catat\\_libur — Catat masuk di hari libur\n` +
        `/ambil\\_libur — Request ambil tabungan libur\n` +
        `/hari\\_libur — Daftar hari libur nasional\n\n` +
        `*Jadwal Shift:*\n` +
        `/jadwal — Lihat jadwal shift saya\n\n` +
        `*Supervisor:*\n` +
        `/pending\\_cuti — Approve/reject request cuti\n` +
        `/rekap\\_cuti — Rekap cuti & izin tim\n` +
        `/pending\\_libur — Approve/reject tabungan libur\n` +
        `/rekap\\_tabungan — Rekap tabungan libur tim\n` +
        `/batch\\_catat — Catat masuk libur banyak anggota\n` +
        `/jadwal\\_tim — Lihat jadwal shift tim\n` +
        `/set\\_shift — Set jadwal shift anggota\n` +
        `/tambah\\_libur — Tambah hari libur nasional\n` +
        `/set\\_kuota — Set kuota cuti tahunan\n` +
        `/set\\_supervisor — Angkat supervisor\n\n` +
        `/help — Bantuan lengkap`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      `*DCSO Bot — Bantuan*\n\n` +
        `*Pengajuan Aset (iAssets):*\n` +
        `/asset — Wizard pengajuan aset baru\n` +
        `/history — Riwayat 10 pengajuan terakhir\n\n` +
        `*Cuti & Izin:*\n` +
        `/cuti — Request cuti tahunan, sakit, atau izin\n` +
        `/sisa\\_cuti — Saldo cuti tahunan & riwayat\n` +
        `/batal\\_cuti — Batalkan request pending\n\n` +
        `*Tabungan Libur:*\n` +
        `/tabungan — Saldo & riwayat tabungan libur\n` +
        `/catat\\_libur — Catat masuk di hari libur (+1)\n` +
        `/ambil\\_libur — Request ambil tabungan libur\n` +
        `/batal\\_libur — Batalkan request ambil pending\n` +
        `/hari\\_libur — Daftar hari libur nasional\n\n` +
        `*Jadwal Shift:*\n` +
        `/jadwal — Lihat jadwal shift saya (bulan ini)\n\n` +
        `*Supervisor Only:*\n` +
        `/pending\\_cuti — Proses request cuti/izin\n` +
        `/rekap\\_cuti — Rekap cuti & izin seluruh tim\n` +
        `/pending\\_libur — Proses request tabungan libur\n` +
        `/rekap\\_tabungan — Rekap tabungan libur tim\n` +
        `/batch\\_catat — Catat banyak anggota masuk libur\n` +
        `/jadwal\\_tim — Jadwal shift tim 7 hari ke depan\n` +
        `/set\\_shift — Set jadwal shift anggota\n` +
        `/tambah\\_libur — Tambah/update hari libur nasional\n` +
        `/set\\_kuota <id> <tahun> <hari> — Set kuota cuti\n` +
        `/set\\_supervisor <id> — Angkat supervisor\n\n` +
        `Hubungi admin jika ada masalah.`,
      { parse_mode: 'Markdown' }
    );
  });
}
