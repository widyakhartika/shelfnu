import { Conversation } from '@grammyjs/conversations';
import { BotContext } from '../../types';
import { tabunganService } from '../../services/tabungan.service';
import { InlineKeyboard } from 'grammy';

function parseDate(str: string): Date | null {
  // accepts DD/MM/YYYY or DD-MM-YYYY
  const match = str.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
  if (isNaN(date.getTime())) return null;
  return date;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Wizard: catat masuk di hari libur (EARNED)
export async function catatLiburConversation(conversation: Conversation<BotContext>, ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id);
  const member = await conversation.external(() => tabunganService.findMember(telegramUserId));
  if (!member) {
    await ctx.reply('Kamu belum terdaftar. Gunakan /daftar terlebih dahulu.');
    return;
  }

  await ctx.reply('📅 Tanggal hari libur yang kamu masuki? (format: DD/MM/YYYY)');
  const dateMsg = await conversation.waitFor('message:text');
  const holidayDate = parseDate(dateMsg.message.text);
  if (!holidayDate) {
    await ctx.reply('Format tanggal tidak valid. Contoh: 17/08/2025');
    return;
  }

  await ctx.reply('🏷️ Nama hari libur / keterangan? (contoh: Hari Kemerdekaan RI)');
  const nameMsg = await conversation.waitFor('message:text');
  const holidayName = nameMsg.message.text.trim();

  await ctx.reply('📝 Catatan tambahan? (opsional, ketik - jika tidak ada)');
  const notesMsg = await conversation.waitFor('message:text');
  const notes = notesMsg.message.text.trim() === '-' ? undefined : notesMsg.message.text.trim();

  const kb = new InlineKeyboard()
    .text('✅ Konfirmasi', 'catat_confirm')
    .text('❌ Batal', 'catat_cancel');

  await ctx.reply(
    `*Konfirmasi Catat Tabungan Libur*\n\n` +
    `Nama: ${member.fullName}\n` +
    `Tanggal: ${formatDate(holidayDate)}\n` +
    `Keterangan: ${holidayName}\n` +
    `Catatan: ${notes ?? '-'}`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );

  const cbq = await conversation.waitFor('callback_query:data');
  await cbq.answerCallbackQuery();

  if (cbq.callbackQuery.data === 'catat_cancel') {
    await ctx.reply('Dibatalkan.');
    return;
  }

  await conversation.external(() =>
    tabunganService.recordEarned(member.id, holidayDate, holidayName, notes)
  );

  const saldo = await conversation.external(() => tabunganService.getSaldo(member.id));
  await ctx.reply(`✅ Berhasil dicatat! Saldo tabungan libur kamu sekarang: *${saldo} hari*`, { parse_mode: 'Markdown' });
}

// Wizard: request ambil tabungan libur (USED)
export async function ambilLiburConversation(conversation: Conversation<BotContext>, ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id);
  const member = await conversation.external(() => tabunganService.findMember(telegramUserId));
  if (!member) {
    await ctx.reply('Kamu belum terdaftar. Gunakan /daftar terlebih dahulu.');
    return;
  }

  const saldo = await conversation.external(() => tabunganService.getSaldo(member.id));
  if (saldo <= 0) {
    await ctx.reply('Saldo tabungan libur kamu 0. Tidak bisa mengambil tabungan.');
    return;
  }

  await ctx.reply(`Saldo kamu: *${saldo} hari*\n\n📅 Tanggal libur yang ingin diambil? (DD/MM/YYYY)`, { parse_mode: 'Markdown' });
  const dateMsg = await conversation.waitFor('message:text');
  const takeDate = parseDate(dateMsg.message.text);
  if (!takeDate) {
    await ctx.reply('Format tanggal tidak valid.');
    return;
  }

  await ctx.reply('📝 Alasan / keterangan ambil libur?');
  const notesMsg = await conversation.waitFor('message:text');
  const notes = notesMsg.message.text.trim();

  const kb = new InlineKeyboard()
    .text('✅ Kirim Request', 'ambil_confirm')
    .text('❌ Batal', 'ambil_cancel');

  await ctx.reply(
    `*Request Ambil Tabungan Libur*\n\n` +
    `Nama: ${member.fullName}\n` +
    `Tanggal ambil: ${formatDate(takeDate)}\n` +
    `Alasan: ${notes}\n\n` +
    `_Request ini akan dikirim ke atasan untuk disetujui._`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );

  const cbq = await conversation.waitFor('callback_query:data');
  await cbq.answerCallbackQuery();

  if (cbq.callbackQuery.data === 'ambil_cancel') {
    await ctx.reply('Dibatalkan.');
    return;
  }

  const entry = await conversation.external(() =>
    tabunganService.requestUsed(member.id, takeDate, notes, notes)
  );

  await ctx.reply(
    `✅ Request berhasil dikirim! Menunggu persetujuan atasan.\n\nID Request: \`${entry.id}\``,
    { parse_mode: 'Markdown' }
  );
}

// Wizard: daftar member
export async function daftarConversation(conversation: Conversation<BotContext>, ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id);
  const existing = await conversation.external(() => tabunganService.findMember(telegramUserId));
  if (existing) {
    await ctx.reply(`Kamu sudah terdaftar sebagai *${existing.fullName}* (${existing.role}).`, { parse_mode: 'Markdown' });
    return;
  }

  await ctx.reply('👤 Masukkan nama lengkap kamu:');
  const nameMsg = await conversation.waitFor('message:text');
  const fullName = nameMsg.message.text.trim();

  if (fullName.length < 2) {
    await ctx.reply('Nama terlalu pendek.');
    return;
  }

  const member = await conversation.external(() =>
    tabunganService.registerMember(telegramUserId, ctx.from?.username, fullName)
  );

  await ctx.reply(`✅ Berhasil didaftarkan sebagai *${member.fullName}*!\n\nGunakan /tabungan untuk melihat saldo.`, { parse_mode: 'Markdown' });
}
