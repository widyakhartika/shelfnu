import { Bot, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import { BotContext } from '../../types';
import { leaveService } from '../../services/leave.service';
import { shiftService } from '../../services/shift.service';
import { tabunganService } from '../../services/tabungan.service';
import { cutiConversation, setShiftConversation } from '../conversations/leave.conversation';

function formatDate(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  ANNUAL: 'Cuti Tahunan',
  SICK: 'Cuti Sakit',
  PERMISSION: 'Izin',
  OTHER: 'Lainnya',
};

const SHIFT_TIMES: Record<string, string> = {
  PAGI: '07:00-15:00',
  SIANG: '15:00-23:00',
  MALAM: '23:00-07:00',
  OFF: 'Libur',
};

export function registerLeaveHandler(bot: Bot<BotContext>) {
  bot.use(createConversation(cutiConversation, 'cuti-wizard'));
  bot.use(createConversation(setShiftConversation, 'set-shift-wizard'));

  // /cuti — request any leave type
  bot.command('cuti', async (ctx) => {
    await ctx.conversation.enter('cuti-wizard');
  });

  // /sisa_cuti — view leave balance
  bot.command('sisa_cuti', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member) { await ctx.reply('Kamu belum terdaftar. Gunakan /daftar.'); return; }

    const sisa = await leaveService.getSisaCuti(member.id);
    const riwayat = await leaveService.getMyLeave(member.id, 5);
    const pending = await leaveService.getMyPendingLeave(member.id);

    let msg = `*Saldo Cuti — ${member.fullName}*\n\n`;
    msg += `Tahun ${sisa.year}:\n`;
    msg += `  Kuota: ${sisa.total} hari\n`;
    msg += `  Terpakai: ${sisa.used} hari\n`;
    msg += `  *Sisa: ${sisa.sisa} hari*\n`;
    if (pending.length > 0) msg += `  Pending: ${pending.length} request\n`;

    if (riwayat.length > 0) {
      msg += `\n*Riwayat terakhir:*\n`;
      for (const r of riwayat) {
        const statusIcon = r.status === 'APPROVED' ? 'OK' : r.status === 'REJECTED' ? 'DITOLAK' : r.status === 'CANCELLED' ? 'BATAL' : 'PENDING';
        msg += `- ${LEAVE_TYPE_LABEL[r.type]} ${formatDate(r.startDate)} (${r.days}h) [${statusIcon}]\n`;
      }
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // /batal_cuti — cancel pending leave request
  bot.command('batal_cuti', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member) { await ctx.reply('Kamu belum terdaftar.'); return; }

    const pending = await leaveService.getMyPendingLeave(member.id);
    if (pending.length === 0) { await ctx.reply('Tidak ada request cuti yang pending.'); return; }

    for (const r of pending) {
      const kb = new InlineKeyboard().text('Batalkan', `cxlv_${r.id}`);
      await ctx.reply(
        `*Request Pending*\n` +
        `${LEAVE_TYPE_LABEL[r.type]}\n` +
        `${formatDate(r.startDate)} s/d ${formatDate(r.endDate)} (${r.days} hari)\n` +
        `Alasan: ${r.reason}`,
        { parse_mode: 'Markdown', reply_markup: kb }
      );
    }
  });

  // /jadwal — view own shift schedule
  bot.command('jadwal', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member) { await ctx.reply('Kamu belum terdaftar. Gunakan /daftar.'); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const schedules = await shiftService.getMySchedule(member.id, today, endOfMonth);
    const todayShift = await shiftService.getMemberTodayShift(member.id);

    let msg = `*Jadwal Shift — ${member.fullName}*\n\n`;

    if (todayShift) {
      msg += `*Hari ini:* ${todayShift.shift} (${SHIFT_TIMES[todayShift.shift]})\n\n`;
    } else {
      msg += `*Hari ini:* Belum dijadwalkan\n\n`;
    }

    if (schedules.length > 0) {
      msg += `*Sisa bulan ini:*\n`;
      for (const s of schedules) {
        const dateStr = s.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        msg += `${dateStr}: ${s.shift} (${SHIFT_TIMES[s.shift]})\n`;
      }
    } else {
      msg += 'Belum ada jadwal untuk bulan ini.';
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // /jadwal_tim — supervisor: view team schedule
  bot.command('jadwal_tim', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member || member.role !== 'SUPERVISOR') {
      await ctx.reply('Hanya supervisor yang dapat mengakses perintah ini.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7days = new Date(today);
    in7days.setDate(in7days.getDate() + 6);
    in7days.setHours(23, 59, 59);

    const schedules = await shiftService.getTeamSchedule(today, in7days);
    const todaySchedule = await shiftService.getTodaySchedule();

    let msg = `*Jadwal Tim — 7 Hari ke Depan*\n\n`;

    if (todaySchedule.length > 0) {
      msg += `*Hari ini:*\n`;
      for (const s of todaySchedule) {
        msg += `${s.shift}: ${s.member.fullName}\n`;
      }
      msg += '\n';
    }

    // Group by date
    const byDate = new Map<string, typeof schedules>();
    for (const s of schedules) {
      const key = s.date.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' });
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(s);
    }

    for (const [date, entries] of byDate) {
      msg += `*${date}*\n`;
      for (const e of entries) {
        msg += `  ${e.shift}: ${e.member.fullName}\n`;
      }
    }

    if (schedules.length === 0) msg += 'Belum ada jadwal yang diset.';

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // /set_shift — supervisor: set shift schedule
  bot.command('set_shift', async (ctx) => {
    await ctx.conversation.enter('set-shift-wizard');
  });

  // /pending_cuti — supervisor: view and process leave requests
  bot.command('pending_cuti', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member || member.role !== 'SUPERVISOR') {
      await ctx.reply('Hanya atasan yang dapat mengakses perintah ini.');
      return;
    }

    const pending = await leaveService.getPendingLeave();
    if (pending.length === 0) {
      await ctx.reply('Tidak ada request cuti/izin yang menunggu persetujuan.');
      return;
    }

    await ctx.reply(`*${pending.length} request menunggu persetujuan:*`, { parse_mode: 'Markdown' });

    for (const r of pending) {
      const kb = new InlineKeyboard()
        .text('Setuju', `alv_${r.id}`)
        .text('Tolak', `rlv_${r.id}`);

      await ctx.reply(
        `*${LEAVE_TYPE_LABEL[r.type]}*\n\n` +
        `Nama: ${r.member.fullName}\n` +
        `Tanggal: ${formatDate(r.startDate)} s/d ${formatDate(r.endDate)}\n` +
        `Hari kerja: ${r.days} hari\n` +
        `Alasan: ${r.reason}\n` +
        `Diajukan: ${formatDate(r.createdAt)}`,
        { parse_mode: 'Markdown', reply_markup: kb }
      );
    }
  });

  // /rekap_cuti — supervisor: comprehensive leave recap
  bot.command('rekap_cuti', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member || member.role !== 'SUPERVISOR') {
      await ctx.reply('Hanya atasan yang dapat mengakses perintah ini.');
      return;
    }

    const year = new Date().getFullYear();
    const rekap = await leaveService.getRekapLeave(year);
    if (rekap.length === 0) { await ctx.reply('Belum ada data.'); return; }

    let msg = `*Rekap Cuti & Izin Tim ${year}*\n\n`;
    for (const r of rekap) {
      const role = r.member.role === 'SUPERVISOR' ? ' [SPV]' : '';
      msg += `*${r.member.fullName}*${role}\n`;
      msg += `  Cuti tahunan: ${r.annual}/${r.quota} (sisa ${r.sisaCuti})\n`;
      msg += `  Sakit: ${r.sick}h | Izin: ${r.permission}h\n\n`;
    }
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // /set_kuota — supervisor: set annual leave quota for a member
  bot.command('set_kuota', async (ctx) => {
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member || member.role !== 'SUPERVISOR') {
      await ctx.reply('Hanya supervisor yang dapat menggunakan perintah ini.');
      return;
    }

    const args = ctx.message?.text?.split(' ').slice(1) ?? [];
    if (args.length < 3) {
      await ctx.reply('Usage: /set\\_kuota <telegram\\_id> <tahun> <hari>\nContoh: /set\\_kuota 123456789 2025 14', { parse_mode: 'Markdown' });
      return;
    }

    const target = await tabunganService.findMember(args[0]);
    if (!target) { await ctx.reply('Member tidak ditemukan.'); return; }

    const year = parseInt(args[1], 10);
    const total = parseInt(args[2], 10);
    if (isNaN(year) || isNaN(total) || total < 0) { await ctx.reply('Parameter tidak valid.'); return; }

    await leaveService.setQuota(target.id, year, total);
    await ctx.reply(`Kuota cuti tahunan *${target.fullName}* tahun ${year} diset ke *${total} hari*.`, { parse_mode: 'Markdown' });
  });

  // Callback: approve leave
  const pendingLeaveRejects = new Map<string, { leaveId: string; supervisorId: string }>();

  bot.callbackQuery(/^alv_(.+)$/, async (ctx) => {
    const leaveId = ctx.match[1];
    const telegramUserId = String(ctx.from?.id);
    const supervisor = await tabunganService.findMember(telegramUserId);
    if (!supervisor || supervisor.role !== 'SUPERVISOR') {
      await ctx.answerCallbackQuery('Hanya atasan yang bisa approve.');
      return;
    }

    const leave = await leaveService.approveLeave(leaveId, supervisor.id);
    await ctx.answerCallbackQuery('Disetujui!');
    await ctx.editMessageText(
      `*DISETUJUI* oleh ${supervisor.fullName}\n\n` +
      `${LEAVE_TYPE_LABEL[leave.type]}\n` +
      `${leave.member.fullName} | ${formatDate(leave.startDate)} s/d ${formatDate(leave.endDate)} (${leave.days} hari)`,
      { parse_mode: 'Markdown' }
    );

    try {
      await ctx.api.sendMessage(
        Number(leave.member.telegramUserId),
        `Request ${LEAVE_TYPE_LABEL[leave.type]} kamu telah *DISETUJUI* oleh ${supervisor.fullName}.\n\n` +
        `${formatDate(leave.startDate)} s/d ${formatDate(leave.endDate)} (${leave.days} hari)\n\n` +
        `Ketik /sisa\\_cuti untuk melihat saldo cuti.`,
        { parse_mode: 'Markdown' }
      );
    } catch { /* member hasn't started bot */ }
  });

  // Callback: reject leave
  bot.callbackQuery(/^rlv_(.+)$/, async (ctx) => {
    const leaveId = ctx.match[1];
    const telegramUserId = String(ctx.from?.id);
    const supervisor = await tabunganService.findMember(telegramUserId);
    if (!supervisor || supervisor.role !== 'SUPERVISOR') {
      await ctx.answerCallbackQuery('Hanya atasan yang bisa menolak.');
      return;
    }

    await ctx.answerCallbackQuery();
    pendingLeaveRejects.set(telegramUserId, { leaveId, supervisorId: supervisor.id });
    await ctx.editMessageText(
      (ctx.callbackQuery.message?.text ?? '') + '\n\n_Menunggu alasan penolakan..._',
      { parse_mode: 'Markdown' }
    );
    await ctx.reply('Ketik alasan penolakan:');
  });

  // Callback: cancel own leave request
  bot.callbackQuery(/^cxlv_(.+)$/, async (ctx) => {
    const leaveId = ctx.match[1];
    const telegramUserId = String(ctx.from?.id);
    const member = await tabunganService.findMember(telegramUserId);
    if (!member) { await ctx.answerCallbackQuery('Error.'); return; }

    const result = await leaveService.cancelLeave(leaveId, member.id);
    if (result) {
      await ctx.answerCallbackQuery('Dibatalkan!');
      await ctx.editMessageText('*DIBATALKAN*\n\nRequest cuti ini telah dibatalkan.', { parse_mode: 'Markdown' });
    } else {
      await ctx.answerCallbackQuery('Tidak bisa dibatalkan.');
    }
  });

  // Handle rejection reason
  bot.on('message:text', async (ctx, next) => {
    const telegramUserId = String(ctx.from?.id);
    const pending = pendingLeaveRejects.get(telegramUserId);
    if (!pending) return next();

    pendingLeaveRejects.delete(telegramUserId);
    const leave = await leaveService.rejectLeave(pending.leaveId, pending.supervisorId, ctx.message.text);
    const supervisor = await tabunganService.findMember(telegramUserId);

    await ctx.reply(
      `Request ${LEAVE_TYPE_LABEL[leave.type]} *${leave.member.fullName}* telah *DITOLAK*.\nAlasan: ${ctx.message.text}`,
      { parse_mode: 'Markdown' }
    );

    try {
      await ctx.api.sendMessage(
        Number(leave.member.telegramUserId),
        `Request ${LEAVE_TYPE_LABEL[leave.type]} kamu telah *DITOLAK*.\n\nAlasan: ${ctx.message.text}\nOleh: ${supervisor?.fullName ?? 'Supervisor'}\n\n` +
        `${formatDate(leave.startDate)} s/d ${formatDate(leave.endDate)} (${leave.days} hari)`,
        { parse_mode: 'Markdown' }
      );
    } catch { /* member hasn't started bot */ }
  });
}
