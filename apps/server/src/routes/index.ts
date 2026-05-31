import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { gameApiService } from '../services/GameApiService.js';

export function createSessionRoutes() {
  const app = new Hono();

  app.post('/create', async (c) => {
    const body = await c.req.json();
    const result = await gameApiService.createSession(body);
    return c.json(result);
  });

  app.post('/transition', async (c) => {
    const body = await c.req.json();
    const result = await gameApiService.transition(body);
    return c.json(result);
  });

  app.post('/event', async (c) => {
    const body = await c.req.json();
    await gameApiService.reportEvent(body);
    return c.json({ ok: true });
  });

  app.get('/:id/context', async (c) => {
    const result = await gameApiService.getContext(c.req.param('id'));
    return c.json(result);
  });

  app.post('/dialogue/backtrack', async (c) => {
    const body = await c.req.json();
    const result = await gameApiService.backtrackDialogue(body);
    return c.json(result);
  });

  return app;
}

export function createDossierRoutes() {
  const app = new Hono();
  app.get('/:sessionId', async (c) => {
    const result = gameApiService.getDossierState(c.req.param('sessionId'));
    return c.json(result);
  });
  return app;
}

export function createMayaRoutes() {
  const app = new Hono();
  app.post('/chat', async (c) => {
    const body = await c.req.json();
    if (!body?.sessionId || !body?.userMessage) {
      return c.json({ error: 'sessionId and userMessage are required' }, 400);
    }
    const result = await gameApiService.mayaChat({
      sessionId: body.sessionId,
      intent: body.intent ?? 'free_chat',
      userMessage: body.userMessage,
      payload: body.payload,
    });
    return c.json(result);
  });
  return app;
}

export function createInvestigationRoutes() {
  const app = new Hono();
  app.post('/examine', async (c) => {
    const body = await c.req.json();
    const result = await gameApiService.examineHotspot(body);
    return c.json(result);
  });
  return app;
}

export function createTrialRoutes() {
  const app = new Hono();
  app.get('/:sessionId/state', async (c) => {
    const result = gameApiService.getTrialState(c.req.param('sessionId'));
    return c.json(result);
  });
  app.post('/advance', async (c) => {
    const body = await c.req.json();
    const result = gameApiService.advanceTrial(body.sessionId);
    return c.json(result);
  });
  app.post('/objection', async (c) => {
    const body = await c.req.json();
    const result = await gameApiService.submitTrialObjection(body);
    return c.json(result);
  });
  app.post('/reconstruct', async (c) => {
    const body = await c.req.json();
    const result = await gameApiService.submitTrialReconstruct(body);
    return c.json(result);
  });
  app.post('/backtrack', async (c) => {
    const body = await c.req.json();
    const result = gameApiService.trialBacktrackFromGuilty(body.sessionId);
    return c.json(result);
  });
  app.post('/press', async (c) => {
    const body = await c.req.json();
    const result = await gameApiService.pressTestimony(body);
    return c.json(result);
  });
  app.post('/present', async (c) => {
    const body = await c.req.json();
    const result = await gameApiService.presentEvidence(body);
    return c.json(result);
  });
  app.post('/choice', async (c) => {
    const body = await c.req.json();
    const result = await gameApiService.submitChoice(body);
    return c.json(result);
  });
  return app;
}

export function createApp(corsOrigin: string) {
  const app = new Hono();
  app.use(
    '*',
    cors({
      origin: corsOrigin,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }),
  );

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.route('/api/session', createSessionRoutes());
  app.route('/api/maya', createMayaRoutes());
  app.route('/api/dossier', createDossierRoutes());
  app.route('/api/investigation', createInvestigationRoutes());
  app.route('/api/trial', createTrialRoutes());

  return app;
}
