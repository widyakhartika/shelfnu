import { Bot, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import { BotContext } from '../../types';
import { tabunganService } from '../../services/tabungan.service';
import { catatLiburConversation, ambilLiburConversation, daftarConversation } from '../conversations/tabungan.conversation';

function formatDate(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function registerTabunganHandler(bot: Bot<BotContext>) {
  bot.use(createConversation(daftarConversation, 'daftar-wizard'));
  bot.use(createConversation(catatLiburConversation, 'catat-libur-wizard'));
  bot.use(createConversation(ambilLiburConversation, 'ambil-libur-wizard'));

  // Register / daftar
  bot.command('daftar', async (ctx) => {
    await ctx.conversation.enter('daftar-wizard');
  });

  // View saldo
  bot.command('tabungan', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member) {
      await ctx.reply('Kamu belum terdaftar. Gunakan /daftar terlebih dahulu.');
      return;
    }
    const saldo = await tabunganService.getSaldo(member.id);
    const riwayat = await tabunganService.getRiwayat(member.id, 5);

    let msg = `🗓️ *Tabungan Libur — ${member.fullName}*\n\n`;
    msg += `💰 *Saldo: ${saldo} hari*\n\n`;

    if (riwayat.length > 0) {
      msg += `📋 *Riwayat terakhir:*\n`;
      for (const e of riwayat) {
        const icon = e.type === 'EARNED' ? '➕' : '➖';
        const status = e.status === 'APPROVED' ? '✅' : e.status === 'REJECTED' ? '❌' : '⏳';
        msg += `${icon} ${formatDate(e.holidayDate)} — ${e.holidayName} ${status}\n`;
      }
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // Catat masuk libur
  bot.command('catat_libur', async (ctx) => {
    await ctx.conversation.enter('catat-libur-wizard');
  });

  // Request ambil libur
  bot.command('ambil_libur', async (ctx) => {
    await ctx.conversation.enter('ambil-libur-wizard');
  });

  // Approve / reject — supervisor only
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

    for (const entry of pending) {
      const kb = new InlineKeyboard()
        .text('✅ Setuju', `approve_${entry.id}`)
        .text('❌ Tolak', `reject_${entry.id}`);

      await ctx.reply(
        `📋 *Request Ambil Libur*\n\n` +
        `Nama: ${entry.member.fullName}\n` +
        `Tanggal: ${formatDate(entry.holidayDate)}\n` +
        `Keterangan: ${entry.holidayName}\n` +
        `Diajukan: ${formatDate(entry.createdAt)}`,
        { parse_mode: 'Markdown', reply_markup: kb }
      );
    }
  });

  // Rekap semua tim — supervisor only
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

    let msg = `📊 *Rekap Tabungan Libur Tim*\n\n`;
    for (const r of rekap) {
      msg += `👤 ${r.member.fullName}\n`;
      msg += `   Masuk libur: ${r.earned} | Ambil: ${r.used} | *Saldo: ${r.saldo}*\n\n`;
    }
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // Set supervisor — hanya bisa dari chat privat dengan mengirim /set_supervisor <userId>
  bot.command('set_supervisor', async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1) ?? [];
    if (args.length === 0) {
      await ctx.reply('Usage: /set_supervisor <telegram_user_id>');
      return;
    }
    await tabunganService.setSupervisor(args[0]);
    await ctx.reply(`✅ User ${args[0]} sekarang menjadi Supervisor.`);
  });

  // Callback query: approve / reject
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
      `✅ *Disetujui* oleh ${supervisor.fullName}\n\n` +
      `Nama: ${entry.member.fullName}\n` +
      `Tanggal: ${formatDate(entry.holidayDate)}\n` +
      `Keterangan: ${entry.holidayName}`,
      { parse_mode: 'Markdown' }
    );
  });

  const pendingRejects = new Map<string, { entryId: string; supervisorId: string; msgId?: number }>();

  bot.callbackQuery(/^reject_(.+)$/, async (ctx) => {
    const entryId = ctx.match[1];
    const telegramUserId = String(ctx.from?.id);
    const supervisor = await tabunganService.findMember(telegramUserId);
    if (!supervisor || supervisor.role !== 'SUPERVISOR') {
      await ctx.answerCallbackQuery('Hanya atasan yang bisa menolak.');
      return;
    }

    await ctx.answerCallbackQuery();
    await ctx.reply(`Alasan penolakan untuk request ini?`);

    pendingRejects.set(telegramUserId, { entryId, supervisorId: supervisor.id, msgId: ctx.callbackQuery.message?.message_id });
    await ctx.editMessageText(
      (ctx.callbackQuery.message?.text ?? '') + '\n\n_Menunggu alasan penolakan..._',
      { parse_mode: 'Markdown' }
    );
  });

  bot.on('message:text', async (ctx, next) => {
    const telegramUserId = String(ctx.from?.id);
    const pending = pendingRejects.get(telegramUserId);
    if (!pending) return next();

    pendingRejects.delete(telegramUserId);
    const entry = await tabunganService.rejectRequest(pending.entryId, pending.supervisorId, ctx.message.text);
    await ctx.reply(
      `❌ Request *${entry.member.fullName}* untuk tanggal ${formatDate(entry.holidayDate)} telah *ditolak*.\nAlasan: ${ctx.message.text}`,
      { parse_mode: 'Markdown' }
    );
  });
}
