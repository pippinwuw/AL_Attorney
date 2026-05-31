import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEnvApiKey } from '@earendil-works/pi-ai';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../../.env') });
config({ path: resolve(__dirname, '../../../.env') });

export interface ServerEnv {
  port: number;
  corsOrigin: string;
  piProvider: string;
  piModel: string;
  piBaseUrl?: string;
  nodeEnv: string;
}

export function loadEnv(): ServerEnv {
  const piProvider = process.env.PI_PROVIDER ?? 'deepseek';
  const piModel = process.env.PI_MODEL ?? 'deepseek-v4-flash';
  const piBaseUrl = process.env.PI_BASE_URL?.trim() || undefined;

  const apiKey = getEnvApiKey(piProvider as Parameters<typeof getEnvApiKey>[0]);
  if (!apiKey) {
    console.warn(
      `[env] No API key found for provider "${piProvider}". LLM calls will use mock fallback.`,
    );
  }

  return {
    port: Number(process.env.PORT ?? 3001),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    piProvider,
    piModel,
    piBaseUrl,
    nodeEnv: process.env.NODE_ENV ?? 'development',
  };
}

export const env = loadEnv();
