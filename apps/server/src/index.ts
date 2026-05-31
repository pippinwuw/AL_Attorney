import { serve } from '@hono/node-server';
import { getEnvApiKey } from '@earendil-works/pi-ai';
import { createApp } from './routes/index.js';
import { env } from './config/env.js';

const app = createApp(env.corsOrigin);
const hasKey = Boolean(getEnvApiKey(env.piProvider as Parameters<typeof getEnvApiKey>[0]));

console.log(`[server] Starting on http://localhost:${env.port}`);
console.log(`[server] LLM: ${env.piProvider}/${env.piModel}${env.piBaseUrl ? ` @ ${env.piBaseUrl}` : ''}`);
console.log(`[server] API key: ${hasKey ? 'configured' : 'missing (maya chat will use fallback)'}`);
console.log(`[server] CORS: ${env.corsOrigin}`);

serve({ fetch: app.fetch, port: env.port });
