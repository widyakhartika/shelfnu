import { Conversation } from '@grammyjs/conversations';
import { InlineKeyboard } from 'grammy';
import { CATEGORIES } from '../../config/categories.config';
import { AssetRequestService } from '../../services/asset-request.service';
import { logger } from '../../logger';
import type { BotContext, AssetRequestData, Urgency } from '../../types';

const assetService = new AssetRequestService();

function buildCategoryKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  CATEGORIES.forEach((cat, i) => {
    kb.text(cat.label, `cat:${cat.id}`);
    if ((i + 1) % 3 === 0) kb.row();
  });
  return kb;
}

function buildUrgencyKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🟢 LOW', 'urg:LOW')
    .text('🟡 MEDIUM', 'urg:MEDIUM')
    .text('🔴 HIGH', 'urg:HIGH');
}

function buildConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ YES, Submit', 'confirm:yes')
    .text('❌ NO, Cancel', 'confirm:no');
}

function formatPreview(data: AssetRequestData): string {
  return (
    `📋 *Asset Request Preview*\n\n` +
    `🖥 *Asset:* ${data.categoryLabel}\n` +
    `📝 *Nama:* ${data.assetName}\n` +
    `🔢 *Qty:* ${data.quantity}\n` +
    `⚡ *Urgency:* ${data.urgency}\n` +
    `💬 *Justification:*\n${data.justification}\n\n` +
    `Konfirmasi submit?`
  );
}

export async function assetConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext
) {
  // Step 1: Choose category
  await ctx.reply('🗂 Pilih jenis aset:', { reply_markup: buildCategoryKeyboard() });

  const catCtx = await conversation.waitForCallbackQuery(/^cat:/);
  await catCtx.answerCallbackQuery();
  const catId = catCtx.callbackQuery.data.replace('cat:', '');
  const category = CATEGORIES.find((c) => c.id === catId);
  if (!category) {
    await ctx.reply('❌ Kategori tidak valid. Ketik /asset untuk memulai ulang.');
    return;
  }

  // Step 2: Asset name
  await catCtx.editMessageText(
    `✅ Kategori: *${category.label}*\n\nMasukkan nama aset secara spesifik:`,
    { parse_mode: 'Markdown' }
  );

  const nameCtx = await conversation.waitFor('message:text');
  const assetName = nameCtx.message.text.trim();
  if (!assetName) {
    await nameCtx.reply('❌ Nama aset tidak boleh kosong. Ketik /asset untuk memulai ulang.');
    return;
  }

  // Step 3: Quantity
  await nameCtx.reply('🔢 Masukkan jumlah (qty):');
  const qtyCtx = await conversation.waitFor('message:text');
  const qty = parseInt(qtyCtx.message.text.trim(), 10);
  if (isNaN(qty) || qty < 1) {
    await qtyCtx.reply('❌ Jumlah tidak valid. Ketik /asset untuk memulai ulang.');
    return;
  }

  // Step 4: Urgency
  await qtyCtx.reply('⚡ Pilih tingkat urgensi:', { reply_markup: buildUrgencyKeyboard() });
  const urgCtx = await conversation.waitForCallbackQuery(/^urg:/);
  await urgCtx.answerCallbackQuery();
  const urgency = urgCtx.callbackQuery.data.replace('urg:', '') as Urgency;

  // Step 5: Justification
  await urgCtx.editMessageText(
    `✅ Urgency: *${urgency}*\n\nMasukkan alasan / justifikasi pengajuan:`,
    { parse_mode: 'Markdown' }
  );
  const justCtx = await conversation.waitFor('message:text');
  const justification = justCtx.message.text.trim();
  if (!justification) {
    await justCtx.reply('❌ Justifikasi tidak boleh kosong. Ketik /asset untuk memulai ulang.');
    return;
  }

  const data: AssetRequestData = {
    assetName,
    categoryId: category.categoryId,
    categoryLabel: category.label,
    quantity: qty,
    urgency,
    justification,
  };

  // Step 6: Preview & confirm
  await justCtx.reply(formatPreview(data), {
    parse_mode: 'Markdown',
    reply_markup: buildConfirmKeyboard(),
  });

  const confirmCtx = await conversation.waitForCallbackQuery(/^confirm:/);
  await confirmCtx.answerCallbackQuery();
  const confirmed = confirmCtx.callbackQuery.data === 'confirm:yes';

  if (!confirmed) {
    await confirmCtx.editMessageText('❌ *Pengajuan dibatalkan.*', { parse_mode: 'Markdown' });
    return;
  }

  await confirmCtx.editMessageText(
    '⏳ *Sedang mengirim request ke iAssets...*',
    { parse_mode: 'Markdown' }
  );

  const userId = String(ctx.from?.id ?? 'unknown');
  const username = ctx.from?.username;

  try {
    const { result } = await assetService.submit(userId, username, data);
    if (result.success) {
      await confirmCtx.editMessageText(
        `✅ *Asset Request Berhasil Dikirim!*\n\n🖥 ${data.categoryLabel} — ${data.assetName} (x${data.quantity})\n⚡ ${data.urgency}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await confirmCtx.editMessageText(
        `❌ *Gagal mengirim request.*\n\nError: ${result.error}`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (err) {
    logger.error('Error submitting asset request', { err });
    await confirmCtx.editMessageText(
      '❌ *Terjadi kesalahan internal. Silakan coba lagi.*',
      { parse_mode: 'Markdown' }
    );
  }
}
