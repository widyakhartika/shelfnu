import { Conversation } from '@grammyjs/conversations';
import { BotContext } from '../../types';
import { leaveService } from '../../services/leave.service';
import { tabunganService } from '../../services/tabungan.service';
import { shiftService } from '../../services/shift.service';
import { InlineKeyboard } from 'grammy';
import { LeaveType, ShiftType } from '@prisma/client';

function parseDate(str: string): Date | null {
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

function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  ANNUAL: 'Cuti Tahunan',
  SICK: 'Cuti Sakit',
  PERMISSION: 'Izin',
  OTHER: 'Lainnya',
};

export async function cutiConversation(conversation: Conversation<BotContext>, ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id);
  const member = await conversation.external(() => tabunganService.findMember(telegramUserId));
  if (!member) { await ctx.reply('Kamu belum terdaftar. Gunakan /daftar terlebih dahulu.'); return; }

  // Choose leave type
  const typeKb = new InlineKeyboard()
    .text('Cuti Tahunan', 'lt:ANNUAL').row()
    .text('Cuti Sakit', 'lt:SICK').row()
    .text('Izin', 'lt:PERMISSION').row()
    .text('Lainnya', 'lt:OTHER');

  await ctx.reply('Pilih jenis cuti/izin:', { reply_markup: typeKb });
  const typeCbq = await conversation.waitFor('callback_query:data');
  await typeCbq.answerCallbackQuery();
  const leaveType = typeCbq.callbackQuery.data.replace('lt:', '') as LeaveType;

  // For annual leave, check quota first
  if (leaveType === 'ANNUAL') {
    const sisa = await conversation.external(() => leaveService.getSisaCuti(member.id));
    if (sisa.sisa <= 0) {
      await ctx.reply(`Sisa cuti tahunan kamu *0 hari* (dari ${sisa.total} hari, sudah dipakai ${sisa.used} hari).\n\nTidak bisa request cuti tahunan.`, { parse_mode: 'Markdown' });
      return;
    }
    await ctx.reply(`Sisa cuti tahunan: *${sisa.sisa} hari*`, { parse_mode: 'Markdown' });
  }

  await ctx.reply(`Tanggal mulai ${LEAVE_TYPE_LABEL[leaveType]}? (DD/MM/YYYY)`);
  const startMsg = await conversation.waitFor('message:text');
  const startDate = parseDate(startMsg.message.text);
  if (!startDate) { await ctx.reply('Format tanggal tidak valid.'); return; }

  await ctx.reply('Tanggal selesai? (DD/MM/YYYY, sama jika 1 hari)');
  const endMsg = await conversation.waitFor('message:text');
  const endDate = parseDate(endMsg.message.text);
  if (!endDate || endDate < startDate) { await ctx.reply('Tanggal tidak valid.'); return; }

  const days = countWeekdays(startDate, endDate);

  // Quota check for annual
  if (leaveType === 'ANNUAL') {
    const sisa = await conversation.external(() => leaveService.getSisaCuti(member.id));
    if (days > sisa.sisa) {
      await ctx.reply(`Jumlah hari kerja (${days} hari) melebihi sisa cuti (${sisa.sisa} hari).`);
      return;
    }
  }

  await ctx.reply('Alasan / keterangan:');
  const reasonMsg = await conversation.waitFor('message:text');
  const reason = reasonMsg.message.text.trim();

  const kb = new InlineKeyboard().text('Kirim Request', 'leave_confirm').text('Batal', 'leave_cancel');

  await ctx.reply(
    `*Konfirmasi ${LEAVE_TYPE_LABEL[leaveType]}*\n\n` +
    `Nama: ${member.fullName}\n` +
    `Mulai: ${formatDate(startDate)}\n` +
    `Selesai: ${formatDate(endDate)}\n` +
    `Hari kerja: *${days} hari*\n` +
    `Alasan: ${reason}`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );

  const cbq = await conversation.waitFor('callback_query:data');
  await cbq.answerCallbackQuery();
  if (cbq.callbackQuery.data === 'leave_cancel') { await ctx.reply('Dibatalkan.'); return; }

  const entry = await conversation.external(() =>
    leaveService.requestLeave(member.id, leaveType, startDate, endDate, reason)
  );

  await ctx.reply(
    `Request berhasil dikirim! Menunggu persetujuan atasan.\nID: \`${entry.id}\``,
    { parse_mode: 'Markdown' }
  );

  // Notify supervisors
  const supervisors = await conversation.external(() => tabunganService.getSupervisors());
  const notifKb = new InlineKeyboard()
    .text('Setuju', `alv_${entry.id}`)
    .text('Tolak', `rlv_${entry.id}`);

  for (const sup of supervisors) {
    try {
      await ctx.api.sendMessage(
        Number(sup.telegramUserId),
        `*Request ${LEAVE_TYPE_LABEL[leaveType]} Baru*\n\n` +
        `Dari: ${member.fullName}\n` +
        `Tanggal: ${formatDate(startDate)} s/d ${formatDate(endDate)}\n` +
        `Hari kerja: ${days} hari\n` +
        `Alasan: ${reason}`,
        { parse_mode: 'Markdown', reply_markup: notifKb }
      );
    } catch { /* supervisor hasn't started bot */ }
  }
}

export async function setShiftConversation(conversation: Conversation<BotContext>, ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id);
  const supervisor = await conversation.external(() => tabunganService.findMember(telegramUserId));
  if (!supervisor || supervisor.role !== 'SUPERVISOR') {
    await ctx.reply('Hanya supervisor yang dapat menggunakan perintah ini.');
    return;
  }

  const allMembers = await conversation.external(() => tabunganService.getAllMembers());
  if (allMembers.length === 0) { await ctx.reply('Belum ada anggota terdaftar.'); return; }

  let listMsg = '*Pilih anggota (nomor, bisa lebih dari satu, pisah koma):*\n\n';
  allMembers.forEach((m, i) => {
    listMsg += `${i + 1}. ${m.fullName}${m.role === 'SUPERVISOR' ? ' [SPV]' : ''}\n`;
  });
  await ctx.reply(listMsg, { parse_mode: 'Markdown' });

  const selectMsg = await conversation.waitFor('message:text');
  const indices = selectMsg.message.text
    .split(/[,\s]+/)
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((n) => !isNaN(n) && n >= 0 && n < allMembers.length);

  if (indices.length === 0) { await ctx.reply('Tidak ada anggota valid dipilih.'); return; }
  const selected = indices.map((i) => allMembers[i]);

  await ctx.reply('Tanggal mulai? (DD/MM/YYYY)');
  const startMsg = await conversation.waitFor('message:text');
  const startDate = parseDate(startMsg.message.text);
  if (!startDate) { await ctx.reply('Format tanggal tidak valid.'); return; }

  await ctx.reply('Tanggal selesai? (DD/MM/YYYY, sama jika 1 hari)');
  const endMsg = await conversation.waitFor('message:text');
  const endDate = parseDate(endMsg.message.text);
  if (!endDate || endDate < startDate) { await ctx.reply('Tanggal tidak valid.'); return; }

  const shiftKb = new InlineKeyboard()
    .text('PAGI (07-15)', 'sh:PAGI')
    .text('SIANG (15-23)', 'sh:SIANG').row()
    .text('MALAM (23-07)', 'sh:MALAM')
    .text('OFF (Libur)', 'sh:OFF');

  await ctx.reply('Pilih shift:', { reply_markup: shiftKb });
  const shiftCbq = await conversation.waitFor('callback_query:data');
  await shiftCbq.answerCallbackQuery();
  const shift = shiftCbq.callbackQuery.data.replace('sh:', '') as ShiftType;

  // Build date list from start to end
  const dates: Date[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const kb = new InlineKeyboard().text('Konfirmasi', 'shift_ok').text('Batal', 'shift_cancel');
  await ctx.reply(
    `*Konfirmasi Set Shift*\n\n` +
    `Anggota: ${selected.map((m) => m.fullName).join(', ')}\n` +
    `Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)} (${dates.length} hari)\n` +
    `Shift: *${shift}*`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );

  const cbq = await conversation.waitFor('callback_query:data');
  await cbq.answerCallbackQuery();
  if (cbq.callbackQuery.data === 'shift_cancel') { await ctx.reply('Dibatalkan.'); return; }

  for (const m of selected) {
    await conversation.external(() => shiftService.setShiftBatch(m.id, dates, shift));
  }

  await ctx.reply(
    `Jadwal shift *${shift}* berhasil diset untuk ${selected.length} anggota\n` +
    `Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)}`,
    { parse_mode: 'Markdown' }
  );

  // Notify members
  const SHIFT_TIMES: Record<string, string> = {
    PAGI: '07:00 - 15:00',
    SIANG: '15:00 - 23:00',
    MALAM: '23:00 - 07:00',
    OFF: 'Libur',
  };
  for (const m of selected) {
    try {
      await ctx.api.sendMessage(
        Number(m.telegramUserId),
        `Jadwal shift kamu diupdate!\n\n` +
        `Shift: *${shift}* (${SHIFT_TIMES[shift]})\n` +
        `Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)}\n` +
        `Oleh: ${supervisor.fullName}\n\n` +
        `Ketik /jadwal untuk lihat jadwal lengkap.`,
        { parse_mode: 'Markdown' }
      );
    } catch { /* member hasn't started bot */ }
  }
}
