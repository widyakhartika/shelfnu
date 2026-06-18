import 'dotenv/config';
import express from 'express';
import { env } from './config/env.config';
import { logger } from './logger';
import { createBot } from './bot';
import { prisma } from './db/prisma';

async function main() {
  await prisma.$connect();
  logger.info('Database connected');

  const bot = createBot();
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  bot.start({
    onStart: (info) => logger.info(`Bot started as @${info.username}`),
  });

  const port = parseInt(env.PORT, 10);
  app.listen(port, () => logger.info(`Express listening on port ${port}`));

  const shutdown = async () => {
    logger.info('Shutting down...');
    await bot.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
