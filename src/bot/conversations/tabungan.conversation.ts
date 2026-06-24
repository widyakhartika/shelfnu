import { Conversation } from '@grammyjs/conversations';
import { BotContext } from '../../types';
import { tabunganService } from '../../services/tabungan.service';
import { InlineKeyboard } from 'grammy';

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

export async function daftarConversation(conversation: Conversation<BotContext>, ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id);
  const existing = await conversation.external(() => tabunganService.findMember(telegramUserId));
  if (existing) {
    await ctx.reply(`Kamu sudah terdaftar sebagai *${existing.fullName}* (${existing.role}).`, { parse_mode: 'Markdown' });
    return;
  }

  await ctx.reply('Masukkan nama lengkap kamu:');
  const nameMsg = await conversation.waitFor('message:text');
  const fullName = nameMsg.message.text.trim();

  if (fullName.length < 2) {
    await ctx.reply('Nama terlalu pendek.');
    return;
  }

  const isFirst = await conversation.external(() => tabunganService.getMemberCount());
  const member = await conversation.external(() =>
    tabunganService.registerMember(telegramUserId, ctx.from?.username, fullName)
  );

  // First member auto-becomes supervisor
  if (isFirst === 0) {
    await conversation.external(() => tabunganService.setSupervisor(telegramUserId));
    await ctx.reply(
      `Berhasil didaftarkan sebagai *${member.fullName}*!\n` +
      `Kamu adalah anggota pertama dan otomatis menjadi *SUPERVISOR*.\n\n` +
      `Gunakan /tabungan untuk melihat saldo.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await ctx.reply(`Berhasil didaftarkan sebagai *${member.fullName}*!\n\nGunakan /tabungan untuk melihat saldo.`, { parse_mode: 'Markdown' });
}

export async function catatLiburConversation(conversation: Conversation<BotContext>, ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id);
  const member = await conversation.external(() => tabunganService.findMember(telegramUserId));
  if (!member) {
    await ctx.reply('Kamu belum terdaftar. Gunakan /daftar terlebih dahulu.');
    return;
  }

  await ctx.reply('Tanggal hari libur yang kamu masuki? (format: DD/MM/YYYY)');
  const dateMsg = await conversation.waitFor('message:text');
  const holidayDate = parseDate(dateMsg.message.text);
  if (!holidayDate) {
    await ctx.reply('Format tanggal tidak valid. Contoh: 17/08/2025');
    return;
  }

  // Auto-suggest if date matches a known public holiday
  const knownHoliday = await conversation.external(() => tabunganService.getHolidayByDate(holidayDate));
  let holidayName: string;

  if (knownHoliday) {
    const kb = new InlineKeyboard()
      .text(`Ya, "${knownHoliday.name}"`, 'suggest_yes')
      .text('Tidak, ketik sendiri', 'suggest_no');
    await ctx.reply(
      `Tanggal ${formatDate(holidayDate)} adalah *${knownHoliday.name}* (${knownHoliday.type}).\nGunakan nama ini?`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
    const suggestCbq = await conversation.waitFor('callback_query:data');
    await suggestCbq.answerCallbackQuery();

    if (suggestCbq.callbackQuery.data === 'suggest_yes') {
      holidayName = knownHoliday.name;
    } else {
      await ctx.reply('Masukkan nama hari libur / keterangan:');
      const nameMsg = await conversation.waitFor('message:text');
      holidayName = nameMsg.message.text.trim();
    }
  } else {
    await ctx.reply('Nama hari libur / keterangan? (contoh: Hari Kemerdekaan RI)');
    const nameMsg = await conversation.waitFor('message:text');
    holidayName = nameMsg.message.text.trim();
  }

  await ctx.reply('Catatan tambahan? (opsional, ketik - jika tidak ada)');
  const notesMsg = await conversation.waitFor('message:text');
  const notes = notesMsg.message.text.trim() === '-' ? undefined : notesMsg.message.text.trim();

  const kb = new InlineKeyboard()
    .text('Konfirmasi', 'catat_confirm')
    .text('Batal', 'catat_cancel');

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
  await ctx.reply(`Berhasil dicatat! Saldo tabungan libur kamu sekarang: *${saldo} hari*`, { parse_mode: 'Markdown' });
}

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

  await ctx.reply(`Saldo kamu: *${saldo} hari*\n\nTanggal libur yang ingin diambil? (DD/MM/YYYY)`, { parse_mode: 'Markdown' });
  const dateMsg = await conversation.waitFor('message:text');
  const takeDate = parseDate(dateMsg.message.text);
  if (!takeDate) {
    await ctx.reply('Format tanggal tidak valid.');
    return;
  }

  await ctx.reply('Alasan / keterangan ambil libur?');
  const notesMsg = await conversation.waitFor('message:text');
  const reason = notesMsg.message.text.trim();

  const kb = new InlineKeyboard()
    .text('Kirim Request', 'ambil_confirm')
    .text('Batal', 'ambil_cancel');

  await ctx.reply(
    `*Request Ambil Tabungan Libur*\n\n` +
    `Nama: ${member.fullName}\n` +
    `Tanggal ambil: ${formatDate(takeDate)}\n` +
    `Alasan: ${reason}\n\n` +
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
    tabunganService.requestUsed(member.id, takeDate, reason)
  );

  await ctx.reply(
    `Request berhasil dikirim! Menunggu persetujuan atasan.\n\nID Request: \`${entry.id}\``,
    { parse_mode: 'Markdown' }
  );

  // Notify all supervisors
  const supervisors = await conversation.external(() => tabunganService.getSupervisors());
  const notifKb = new InlineKeyboard()
    .text('Setuju', `approve_${entry.id}`)
    .text('Tolak', `reject_${entry.id}`);

  for (const sup of supervisors) {
    try {
      await ctx.api.sendMessage(
        Number(sup.telegramUserId),
        `*Request Ambil Tabungan Libur Baru*\n\n` +
        `Dari: ${member.fullName}\n` +
        `Tanggal: ${formatDate(takeDate)}\n` +
        `Alasan: ${reason}\n\n` +
        `Gunakan tombol di bawah atau /pending\\_libur untuk merespons.`,
        { parse_mode: 'Markdown', reply_markup: notifKb }
      );
    } catch {
      // Supervisor may not have started bot chat
    }
  }
}

export async function batchCatatConversation(conversation: Conversation<BotContext>, ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id);
  const member = await conversation.external(() => tabunganService.findMember(telegramUserId));
  if (!member || member.role !== 'SUPERVISOR') {
    await ctx.reply('Hanya supervisor yang dapat menggunakan perintah ini.');
    return;
  }

  await ctx.reply('Tanggal hari libur? (format: DD/MM/YYYY)');
  const dateMsg = await conversation.waitFor('message:text');
  const holidayDate = parseDate(dateMsg.message.text);
  if (!holidayDate) {
    await ctx.reply('Format tanggal tidak valid.');
    return;
  }

  // Auto-suggest holiday name
  const knownHoliday = await conversation.external(() => tabunganService.getHolidayByDate(holidayDate));
  let holidayName: string;

  if (knownHoliday) {
    holidayName = knownHoliday.name;
    await ctx.reply(`Hari libur: *${knownHoliday.name}*`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('Nama hari libur / keterangan?');
    const nameMsg = await conversation.waitFor('message:text');
    holidayName = nameMsg.message.text.trim();
  }

  // Show all members as selectable list
  const allMembers = await conversation.external(() => tabunganService.getAllMembers());
  if (allMembers.length === 0) {
    await ctx.reply('Belum ada anggota terdaftar.');
    return;
  }

  let listMsg = `*Pilih anggota yang masuk pada ${formatDate(holidayDate)}*\n` +
    `_(${holidayName})_\n\n` +
    `Kirim nomor anggota dipisah koma.\nContoh: 1,3,5\n\n`;

  allMembers.forEach((m, i) => {
    const role = m.role === 'SUPERVISOR' ? ' [SPV]' : '';
    listMsg += `${i + 1}. ${m.fullName}${role}\n`;
  });

  await ctx.reply(listMsg, { parse_mode: 'Markdown' });
  const selectMsg = await conversation.waitFor('message:text');
  const indices = selectMsg.message.text
    .split(/[,\s]+/)
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((n) => !isNaN(n) && n >= 0 && n < allMembers.length);

  if (indices.length === 0) {
    await ctx.reply('Tidak ada anggota yang valid dipilih.');
    return;
  }

  const selected = indices.map((i) => allMembers[i]);
  const selectedIds = selected.map((m) => m.id);

  const kb = new InlineKeyboard()
    .text('Konfirmasi', 'batch_confirm')
    .text('Batal', 'batch_cancel');

  await ctx.reply(
    `*Konfirmasi Batch Catat*\n\n` +
    `Tanggal: ${formatDate(holidayDate)}\n` +
    `Keterangan: ${holidayName}\n` +
    `Anggota (${selected.length}):\n` +
    selected.map((m) => `- ${m.fullName}`).join('\n'),
    { parse_mode: 'Markdown', reply_markup: kb }
  );

  const cbq = await conversation.waitFor('callback_query:data');
  await cbq.answerCallbackQuery();

  if (cbq.callbackQuery.data === 'batch_cancel') {
    await ctx.reply('Dibatalkan.');
    return;
  }

  const result = await conversation.external(() =>
    tabunganService.batchRecordEarned(selectedIds, holidayDate, holidayName)
  );

  await ctx.reply(
    `Berhasil mencatat *${result.count} anggota* masuk pada ${formatDate(holidayDate)} (${holidayName}).`,
    { parse_mode: 'Markdown' }
  );

  // Notify each member
  for (const m of selected) {
    try {
      await ctx.api.sendMessage(
        Number(m.telegramUserId),
        `Tabungan libur kamu bertambah +1!\n` +
        `Tanggal: ${formatDate(holidayDate)}\n` +
        `Keterangan: ${holidayName}\n\n` +
        `Dicatat oleh: ${member.fullName}\nKetik /tabungan untuk lihat saldo.`
      );
    } catch {
      // Member may not have started bot chat
    }
  }
}

export async function tambahLiburConversation(conversation: Conversation<BotContext>, ctx: BotContext) {
  const telegramUserId = String(ctx.from?.id);
  const member = await conversation.external(() => tabunganService.findMember(telegramUserId));
  if (!member || member.role !== 'SUPERVISOR') {
    await ctx.reply('Hanya supervisor yang dapat menggunakan perintah ini.');
    return;
  }

  await ctx.reply(
    'Masukkan data hari libur.\n' +
    'Format: DD/MM/YYYY | Nama Hari Libur | Tipe\n\n' +
    'Tipe: NATIONAL atau CUTI\\_BERSAMA\n\n' +
    'Contoh:\n`17/08/2025 | Hari Kemerdekaan RI | NATIONAL`\n' +
    'Atau kirim beberapa baris sekaligus.',
    { parse_mode: 'Markdown' }
  );

  const inputMsg = await conversation.waitFor('message:text');
  const lines = inputMsg.message.text.trim().split('\n');
  const added: string[] = [];
  const failed: string[] = [];

  for (const line of lines) {
    const parts = line.split('|').map((s) => s.trim());
    if (parts.length < 3) {
      failed.push(line);
      continue;
    }
    const date = parseDate(parts[0]);
    if (!date) {
      failed.push(line);
      continue;
    }
    const name = parts[1];
    const type = parts[2].toUpperCase() === 'CUTI_BERSAMA' ? 'CUTI_BERSAMA' : 'NATIONAL';

    await conversation.external(() => tabunganService.addPublicHoliday(date, name, type as 'NATIONAL' | 'CUTI_BERSAMA'));
    added.push(`${formatDate(date)} — ${name} (${type})`);
  }

  let msg = '';
  if (added.length > 0) {
    msg += `*Berhasil ditambahkan (${added.length}):*\n${added.join('\n')}\n\n`;
  }
  if (failed.length > 0) {
    msg += `*Gagal (${failed.length}):*\n${failed.join('\n')}`;
  }

  await ctx.reply(msg || 'Tidak ada data yang diproses.', { parse_mode: 'Markdown' });
}
