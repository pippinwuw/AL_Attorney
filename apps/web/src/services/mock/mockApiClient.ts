import type {
  SessionContext,
  GamePhase,
  PlayerRole,
  MayaIntent,
  DialogLine,
  EvidenceItem,
  ChoiceRequest,
  CaseDossier,
} from '@ace-attorney/shared';
import {
  mockAdvanceTrial,
  mockGetTrialState,
  mockInitTrial,
  mockTrialBacktrack,
  mockTrialObjection,
  mockTrialReconstruct,
} from './mockTrial';
import { case01, getEvidence } from '@/data/mock/caseData';

const sessions = new Map<string, SessionContext>();

function createId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultDossier(caseTitle: string): CaseDossier {
  const now = Date.now();
  return {
    title: `${caseTitle} — 案情卷宗`,
    sections: [
      { id: 'overview', heading: '案件概要', body: '（真宵尚未整理，请指导我补充。）' },
      { id: 'timeline', heading: '时间线', body: '（待补充）' },
      { id: 'evidence_summary', heading: '证物摘要', body: '（待补充）' },
      { id: 'contradictions', heading: '矛盾与疑点', body: '（待补充）' },
    ],
    updatedAt: now,
  };
}

function createEmptyContext(sessionId: string, caseId: string, playerRole: PlayerRole): SessionContext {
  return {
    sessionId,
    caseId,
    playerRole,
    currentPhase: 'prologue',
    slices: {
      prologue: { scenesVisited: [], npcsMet: [] },
      investigation: {
        currentSceneId: 'crime_scene',
        examinedHotspots: [],
        crimeTimeline: [],
        evidenceNotes: {},
      },
      trial: {
        testimonyProgress: {},
        contradictionsFound: [],
        hpRemaining: 5,
        pressHistory: [],
        presentHistory: [],
      },
    },
    global: {
      knownFacts: [],
      evidenceCollected: [],
      npcImpressions: {},
      playerChoiceLog: [],
      mayaChatHistory: [],
      caseDossier: createDefaultDossier(case01.title),
      dossierChatHistory: [],
    },
  };
}

function toSnapshot(ctx: SessionContext) {
  return {
    sessionId: ctx.sessionId,
    currentPhase: ctx.currentPhase,
    playerRole: ctx.playerRole,
    knownFacts: ctx.global.knownFacts,
    evidenceCollected: ctx.global.evidenceCollected,
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickMayaResponse(intent: MayaIntent): string {
  const responses = case01.mayaResponses[intent] ?? case01.mayaResponses.free_chat ?? [];
  if (responses.length === 0) return '……（真宵正在思考）';
  return responses[Math.floor(Math.random() * responses.length)]!;
}

export class MockApiClient {
  async createSession(params: { caseId: string; playerRole: PlayerRole }) {
    const sessionId = createId();
    const ctx = createEmptyContext(sessionId, params.caseId, params.playerRole);
    sessions.set(sessionId, ctx);
    return { sessionId, context: toSnapshot(ctx) };
  }

  async transition(params: { sessionId: string; toPhase: GamePhase }) {
    const ctx = sessions.get(params.sessionId);
    if (!ctx) throw new Error('Session not found');
    ctx.currentPhase = params.toPhase;
    if (params.toPhase === 'investigation') {
      ctx.slices.prologue.summary = '案件背景：被告被指控在电梯案中作案，需调查现场。';
    }
    if (params.toPhase === 'trial') {
      mockInitTrial(params.sessionId);
    }
    return { success: true, contextSnapshot: toSnapshot(ctx) };
  }

  async reportEvent(params: { sessionId: string; eventType: string; payload?: Record<string, unknown> }) {
    const ctx = sessions.get(params.sessionId);
    if (!ctx) return;
    if (params.eventType === 'npc_met' && params.payload?.npcId) {
      const npcId = String(params.payload.npcId);
      if (!ctx.slices.prologue.npcsMet.includes(npcId)) {
        ctx.slices.prologue.npcsMet.push(npcId);
      }
    }
  }

  async getContext(sessionId: string) {
    const ctx = sessions.get(sessionId);
    if (!ctx) throw new Error('Session not found');
    return toSnapshot(ctx);
  }

  async mayaChat(params: {
    sessionId: string;
    intent: MayaIntent;
    userMessage: string;
    payload?: { evidenceId?: string; testimonyLineId?: string };
  }) {
    await delay(500);
    const ctx = sessions.get(params.sessionId);
    const reply = pickMayaResponse(params.intent);
    const userMsg = {
      id: `msg_${Date.now()}_u`,
      role: 'user' as const,
      content: params.userMessage,
      timestamp: Date.now(),
    };
    const mayaMsg = {
      id: `msg_${Date.now()}_m`,
      role: 'maya' as const,
      content: reply,
      segments: [{ text: reply }],
      timestamp: Date.now(),
    };

    const isDossier = params.intent === 'edit_dossier';
    let dossier: CaseDossier | undefined;

    if (ctx) {
      if (isDossier) {
        ctx.global.dossierChatHistory.push(userMsg, mayaMsg);
        const overview = ctx.global.caseDossier.sections.find((s) => s.id === 'overview');
        if (overview && params.userMessage.trim().length > 2) {
          if (overview.body.includes('（真宵尚未整理')) {
            overview.body = params.userMessage.trim();
          } else if (!overview.body.includes(params.userMessage.trim())) {
            overview.body = `${overview.body}\n${params.userMessage.trim()}`;
          }
          ctx.global.caseDossier.updatedAt = Date.now();
        }
        dossier = ctx.global.caseDossier;
      } else {
        ctx.global.mayaChatHistory.push(userMsg, mayaMsg);
      }
    }

    const hintLevel: 'subtle' | 'direct' | undefined =
      params.intent === 'trial_hint'
        ? ctx && ctx.slices.trial.hpRemaining <= 2
          ? 'direct'
          : 'subtle'
        : undefined;
    return {
      reply,
      segments: [{ text: reply }],
      dossier,
      suggestedActions: params.intent === 'analyze_evidence' ? ['检查现场照片'] : undefined,
      hintLevel,
    };
  }

  async getDossierState(sessionId: string) {
    const ctx = sessions.get(sessionId);
    if (!ctx) throw new Error('Session not found');
    return {
      dossier: ctx.global.caseDossier,
      dossierChatHistory: ctx.global.dossierChatHistory,
    };
  }

  async examineHotspot(params: { sessionId: string; hotspotId: string }) {
    const ctx = sessions.get(params.sessionId);
    const hotspot = case01.investigation.hotspots.find((h) => h.id === params.hotspotId);
    if (!hotspot) throw new Error('Hotspot not found');

    const dialogLines: DialogLine[] = [];
    if (hotspot.dialogId && case01.investigation.dialogs[hotspot.dialogId]) {
      dialogLines.push(case01.investigation.dialogs[hotspot.dialogId]);
    }

    let evidence: EvidenceItem | undefined;
    if (hotspot.evidenceId) {
      evidence = getEvidence(hotspot.evidenceId);
      if (evidence && ctx) {
        const exists = ctx.global.evidenceCollected.some((e) => e.id === evidence!.id);
        if (!exists) ctx.global.evidenceCollected.push(evidence);
      }
    }

    if (ctx && !ctx.slices.investigation.examinedHotspots.includes(params.hotspotId)) {
      ctx.slices.investigation.examinedHotspots.push(params.hotspotId);
    }

    return { dialog: dialogLines, evidence };
  }

  async pressTestimony(params: { sessionId: string; witnessId: string; lineId: string }) {
    const witness = case01.trial.witnesses.find((w) => w.id === params.witnessId);
    const line = witness?.testimony.find((t) => t.id === params.lineId);
    const dialog: DialogLine[] = line?.pressResponse
      ? [{ id: `press_${params.lineId}`, speaker: witness!.name, text: line.pressResponse, portrait: witness!.portrait }]
      : [{ id: `press_${params.lineId}`, speaker: witness!.name, text: '……我已经说过了。', portrait: witness!.portrait }];

    const ctx = sessions.get(params.sessionId);
    if (ctx) {
      ctx.slices.trial.pressHistory.push({ lineId: params.lineId, timestamp: Date.now() });
    }
    return { dialog };
  }

  async presentEvidence(params: {
    sessionId: string;
    witnessId: string;
    lineId: string;
    evidenceId: string;
  }) {
    const ctx = sessions.get(params.sessionId);
    const witness = case01.trial.witnesses.find((w) => w.id === params.witnessId);
    const line = witness?.testimony.find((t) => t.id === params.lineId);
    const rule = line?.presentEvidence?.find((p) => p.evidenceId === params.evidenceId);

    if (rule) {
      const successDialog = case01.trialDialogs[rule.successDialogId];
      const dialog: DialogLine[] = successDialog
        ? [{ ...successDialog, portrait: successDialog.portrait }]
        : [{ id: 'success', speaker: '成步堂龙一', text: '异议！证词与证物矛盾！', portrait: 'naruhodo' }];

      if (ctx) {
        ctx.slices.trial.contradictionsFound.push(params.lineId);
        ctx.slices.trial.presentHistory.push({
          lineId: params.lineId,
          evidenceId: params.evidenceId,
          success: true,
          timestamp: Date.now(),
        });
      }
      return { success: true, dialog, hpDelta: 0 };
    }

    if (ctx) {
      ctx.slices.trial.hpRemaining = Math.max(0, ctx.slices.trial.hpRemaining - 1);
      ctx.slices.trial.presentHistory.push({
        lineId: params.lineId,
        evidenceId: params.evidenceId,
        success: false,
        timestamp: Date.now(),
      });
    }
    return {
      success: false,
      dialog: [{ id: 'fail', speaker: '法官', text: '辩护律师，这似乎与证词无关……', portrait: 'judge' }],
      hpDelta: -1,
      mayaHint: pickMayaResponse('trial_hint'),
    };
  }

  async submitChoice(_params: ChoiceRequest) {
    return {
      success: true,
      dialog: [{ id: 'choice_ok', speaker: '成步堂龙一', text: '就是这样！', portrait: 'naruhodo' }],
      hpDelta: 0,
    };
  }

  async getTrialState(sessionId: string) {
    await delay(80);
    return mockGetTrialState(sessionId);
  }

  async advanceTrial(sessionId: string) {
    await delay(80);
    return { state: mockAdvanceTrial(sessionId) };
  }

  async submitTrialObjection(params: import('@ace-attorney/shared').TrialObjectionRequest) {
    await delay(200);
    return { state: mockTrialObjection(params) };
  }

  async submitTrialReconstruct(params: import('@ace-attorney/shared').TrialReconstructRequest) {
    await delay(200);
    const result = mockTrialReconstruct(params);
    return result;
  }

  async trialBacktrackFromGuilty(sessionId: string) {
    await delay(100);
    return { state: mockTrialBacktrack(sessionId) };
  }
}

export const mockApiClient = new MockApiClient();
