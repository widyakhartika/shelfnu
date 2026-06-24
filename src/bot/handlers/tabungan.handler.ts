import { Bot, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import { BotContext } from '../../types';
import { tabunganService } from '../../services/tabungan.service';
import {
  catatLiburConversation,
  ambilLiburConversation,
  daftarConversation,
  batchCatatConversation,
  tambahLiburConversation,
} from '../conversations/tabungan.conversation';

function formatDate(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function registerTabunganHandler(bot: Bot<BotContext>) {
  bot.use(createConversation(daftarConversation, 'daftar-wizard'));
  bot.use(createConversation(catatLiburConversation, 'catat-libur-wizard'));
  bot.use(createConversation(ambilLiburConversation, 'ambil-libur-wizard'));
  bot.use(createConversation(batchCatatConversation, 'batch-catat-wizard'));
  bot.use(createConversation(tambahLiburConversation, 'tambah-libur-wizard'));

  bot.command('daftar', async (ctx) => {
    await ctx.conversation.enter('daftar-wizard');
  });

  bot.command('tabungan', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member) {
      await ctx.reply('Kamu belum terdaftar. Gunakan /daftar terlebih dahulu.');
      return;
    }
    const saldo = await tabunganService.getSaldo(member.id);
    const riwayat = await tabunganService.getRiwayat(member.id, 5);
    const pending = await tabunganService.getMyPending(member.id);

    let msg = `*Tabungan Libur — ${member.fullName}*\n\n`;
    msg += `Saldo: *${saldo} hari*\n`;
    if (pending.length > 0) {
      msg += `Pending request: *${pending.length}*\n`;
    }
    msg += '\n';

    if (riwayat.length > 0) {
      msg += `*Riwayat terakhir:*\n`;
      for (const e of riwayat) {
        const icon = e.type === 'EARNED' ? '+' : '-';
        const statusIcon = e.status === 'APPROVED' ? 'OK' : e.status === 'REJECTED' ? 'DITOLAK' : 'PENDING';
        msg += `${icon} ${formatDate(e.holidayDate)} — ${e.holidayName} [${statusIcon}]\n`;
      }
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('catat_libur', async (ctx) => {
    await ctx.conversation.enter('catat-libur-wizard');
  });

  bot.command('ambil_libur', async (ctx) => {
    await ctx.conversation.enter('ambil-libur-wizard');
  });

  bot.command('batch_catat', async (ctx) => {
    await ctx.conversation.enter('batch-catat-wizard');
  });

  bot.command('tambah_libur', async (ctx) => {
    await ctx.conversation.enter('tambah-libur-wizard');
  });

  bot.command('hari_libur', async (ctx) => {
    const year = new Date().getFullYear();
    const holidays = await tabunganService.getPublicHolidays(year);
    const upcoming = await tabunganService.getUpcomingHolidays(5);

    let msg = `*Hari Libur Nasional ${year}*\n\n`;

    if (upcoming.length > 0) {
      msg += `*Akan datang:*\n`;
      for (const h of upcoming) {
        msg += `- ${formatDate(h.date)} — ${h.name} (${h.type})\n`;
      }
      msg += '\n';
    }

    if (holidays.length > 0) {
      msg += `*Semua hari libur ${year} (${holidays.length}):*\n`;
      for (const h of holidays) {
        const past = h.date < new Date() ? '~' : '';
        msg += `${past}${formatDate(h.date)} — ${h.name}${past}\n`;
      }
    } else {
      msg += 'Belum ada data hari libur. Supervisor bisa tambah via /tambah\\_libur';
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('batal_libur', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member) {
      await ctx.reply('Kamu belum terdaftar.');
      return;
    }

    const pending = await tabunganService.getMyPending(member.id);
    if (pending.length === 0) {
      await ctx.reply('Tidak ada request pending yang bisa dibatalkan.');
      return;
    }

    for (const entry of pending) {
      const kb = new InlineKeyboard()
        .text('Batalkan', `cancel_${entry.id}`);

      await ctx.reply(
        `*Request Pending*\n` +
        `Tanggal: ${formatDate(entry.holidayDate)}\n` +
        `Alasan: ${entry.holidayName}\n` +
        `Diajukan: ${formatDate(entry.createdAt)}`,
        { parse_mode: 'Markdown', reply_markup: kb }
      );
    }
  });

  bot.command('pending_libur', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member || member.role !== 'SUPERVISOR') {
      await ctx.reply('Hanya atasan yang dapat mengakses perintah ini.');
      return;
    }

    const pending = await tabunganService.getPendingRequests();
    if (pending.length === 0) {
      await ctx.reply('Tidak ada request tabungan libur yang menunggu persetujuan.');
      return;
    }

    await ctx.reply(`*${pending.length} request menunggu persetujuan:*`, { parse_mode: 'Markdown' });

    for (const entry of pending) {
      const kb = new InlineKeyboard()
        .text('Setuju', `approve_${entry.id}`)
        .text('Tolak', `reject_${entry.id}`);

      await ctx.reply(
        `*Request Ambil Libur*\n\n` +
        `Nama: ${entry.member.fullName}\n` +
        `Tanggal: ${formatDate(entry.holidayDate)}\n` +
        `Keterangan: ${entry.holidayName}\n` +
        `Diajukan: ${formatDate(entry.createdAt)}`,
        { parse_mode: 'Markdown', reply_markup: kb }
      );
    }
  });

  bot.command('rekap_tabungan', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member || member.role !== 'SUPERVISOR') {
      await ctx.reply('Hanya atasan yang dapat mengakses perintah ini.');
      return;
    }

    const rekap = await tabunganService.getRekapAll();
    if (rekap.length === 0) {
      await ctx.reply('Belum ada anggota yang terdaftar.');
      return;
    }

    let msg = `*Rekap Tabungan Libur Tim*\n\n`;
    let totalEarned = 0;
    let totalUsed = 0;
    for (const r of rekap) {
      const role = r.member.role === 'SUPERVISOR' ? ' [SPV]' : '';
      msg += `*${r.member.fullName}*${role}\n`;
      msg += `  Masuk: ${r.earned} | Ambil: ${r.used} | Saldo: *${r.saldo}*\n\n`;
      totalEarned += r.earned;
      totalUsed += r.used;
    }
    msg += `---\n*Total Tim:* Masuk ${totalEarned} | Ambil ${totalUsed} | Saldo ${totalEarned - totalUsed}`;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('set_supervisor', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const caller = await tabunganService.findMember(telegramUserId);

    // Only existing supervisors (or first user ever) can promote
    const memberCount = await tabunganService.getMemberCount();
    if (memberCount > 0 && (!caller || caller.role !== 'SUPERVISOR')) {
      await ctx.reply('Hanya supervisor yang bisa mengatur perintah ini.');
      return;
    }

    const args = ctx.message?.text?.split(' ').slice(1) ?? [];
    if (args.length === 0) {
      await ctx.reply('Usage: /set\\_supervisor <telegram\\_user\\_id>', { parse_mode: 'Markdown' });
      return;
    }

    const targetId = args[0];
    const target = await tabunganService.findMember(targetId);
    if (!target) {
      await ctx.reply(`User dengan ID ${targetId} belum terdaftar. Suruh /daftar dulu.`);
      return;
    }

    if (target.role === 'SUPERVISOR') {
      await ctx.reply(`${target.fullName} sudah menjadi Supervisor.`);
      return;
    }

    await tabunganService.setSupervisor(targetId);
    await ctx.reply(`${target.fullName} sekarang menjadi *SUPERVISOR*.`, { parse_mode: 'Markdown' });

    // Notify the promoted member
    try {
      await ctx.api.sendMessage(
        Number(targetId),
        `Kamu telah diangkat menjadi *SUPERVISOR* oleh ${caller?.fullName ?? 'Admin'}.\n\n` +
        `Kamu sekarang bisa:\n` +
        `/pending\\_libur — Approve/reject request\n` +
        `/rekap\\_tabungan — Lihat rekap tim\n` +
        `/batch\\_catat — Catat masuk libur banyak anggota`,
        { parse_mode: 'Markdown' }
      );
    } catch {
      // Target may not have started bot chat
    }
  });

  // Callback: approve
  bot.callbackQuery(/^approve_(.+)$/, async (ctx) => {
    const entryId = ctx.match[1];
    const telegramUserId = String(ctx.from?.id);
    const supervisor = await tabunganService.findMember(telegramUserId);
    if (!supervisor || supervisor.role !== 'SUPERVISOR') {
      await ctx.answerCallbackQuery('Hanya atasan yang bisa approve.');
      return;
    }

    const entry = await tabunganService.approveRequest(entryId, supervisor.id);
    await ctx.answerCallbackQuery('Disetujui!');
    await ctx.editMessageText(
      `*DISETUJUI* oleh ${supervisor.fullName}\n\n` +
      `Nama: ${entry.member.fullName}\n` +
      `Tanggal: ${formatDate(entry.holidayDate)}\n` +
      `Keterangan: ${entry.holidayName}`,
      { parse_mode: 'Markdown' }
    );

    // Notify the member
    try {
      await ctx.api.sendMessage(
        Number(entry.member.telegramUserId),
        `Request ambil libur kamu pada ${formatDate(entry.holidayDate)} telah *DISETUJUI* oleh ${supervisor.fullName}.\n\nKetik /tabungan untuk lihat saldo terbaru.`,
        { parse_mode: 'Markdown' }
      );
    } catch {
      // Member may not have started bot chat
    }
  });

  // Callback: reject
  const pendingRejects = new Map<string, { entryId: string; supervisorId: string }>();

  bot.callbackQuery(/^reject_(.+)$/, async (ctx) => {
    const entryId = ctx.match[1];
    const telegramUserId = String(ctx.from?.id);
    const supervisor = await tabunganService.findMember(telegramUserId);
    if (!supervisor || supervisor.role !== 'SUPERVISOR') {
      await ctx.answerCallbackQuery('Hanya atasan yang bisa menolak.');
      return;
    }

    await ctx.answerCallbackQuery();
    pendingRejects.set(telegramUserId, { entryId, supervisorId: supervisor.id });
    await ctx.editMessageText(
      (ctx.callbackQuery.message?.text ?? '') + '\n\n_Menunggu alasan penolakan..._',
      { parse_mode: 'Markdown' }
    );
    await ctx.reply('Ketik alasan penolakan:');
  });

  // Callback: cancel own request
  bot.callbackQuery(/^cancel_(.+)$/, async (ctx) => {
    const entryId = ctx.match[1];
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member) {
      await ctx.answerCallbackQuery('Error.');
      return;
    }

    const result = await tabunganService.cancelRequest(entryId, member.id);
    if (result) {
      await ctx.answerCallbackQuery('Dibatalkan!');
      await ctx.editMessageText('*DIBATALKAN*\n\nRequest ini telah dibatalkan.', { parse_mode: 'Markdown' });
    } else {
      await ctx.answerCallbackQuery('Tidak bisa dibatalkan (sudah diproses atau bukan milikmu).');
    }
  });

  // Handle reject reason text
  bot.on('message:text', async (ctx, next) => {
    const telegramUserId = String(ctx.from?.id);
    const pending = pendingRejects.get(telegramUserId);
    if (!pending) return next();

    pendingRejects.delete(telegramUserId);
    const entry = await tabunganService.rejectRequest(pending.entryId, pending.supervisorId, ctx.message.text);
    const supervisor = await tabunganService.findMember(telegramUserId);

    await ctx.reply(
      `Request *${entry.member.fullName}* untuk tanggal ${formatDate(entry.holidayDate)} telah *DITOLAK*.\nAlasan: ${ctx.message.text}`,
      { parse_mode: 'Markdown' }
    );

    // Notify the member
    try {
      await ctx.api.sendMessage(
        Number(entry.member.telegramUserId),
        `Request ambil libur kamu pada ${formatDate(entry.holidayDate)} telah *DITOLAK*.\n\nAlasan: ${ctx.message.text}\nOleh: ${supervisor?.fullName ?? 'Supervisor'}\n\nKetik /tabungan untuk lihat saldo.`,
        { parse_mode: 'Markdown' }
      );
    } catch {
      // Member may not have started bot chat
    }
  });
}
