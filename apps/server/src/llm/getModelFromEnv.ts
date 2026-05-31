import { getModel, type Model } from '@earendil-works/pi-ai';
import { env } from '../config/env.js';

export function getModelFromEnv(): Model<string> {
  const model = getModel(
    env.piProvider as Parameters<typeof getModel>[0],
    env.piModel as Parameters<typeof getModel>[1],
  );

  if (env.piBaseUrl) {
    return { ...model, baseUrl: env.piBaseUrl.replace(/\/$/, '') };
  }

  return model;
}
