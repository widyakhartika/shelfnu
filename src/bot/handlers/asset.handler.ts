import { Bot } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import { assetConversation } from '../conversations/asset.conversation';
import type { BotContext } from '../../types';

export const ASSET_CONVERSATION = 'asset-wizard';

export function registerAssetHandlers(bot: Bot<BotContext>) {
  bot.use(createConversation(assetConversation, ASSET_CONVERSATION));

  bot.command('asset', async (ctx) => {
    await ctx.conversation.enter(ASSET_CONVERSATION);
  });
}
