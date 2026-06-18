import { MemorySessionStorage, session } from 'grammy';
import type { SessionData, BotContext } from '../../types';

export function createSessionMiddleware() {
  return session<SessionData, BotContext>({
    initial: (): SessionData => ({}),
    storage: new MemorySessionStorage(),
  });
}
