import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  IASSETS_BASE_URL: z.string().url().default('https://shelfnu.blackeye.id'),
  IASSETS_SESSION_COOKIE: z.string().min(1, 'IASSETS_SESSION_COOKIE is required'),
  IASSETS_ORGANIZATION_ID: z.string().min(1, 'IASSETS_ORGANIZATION_ID is required'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
