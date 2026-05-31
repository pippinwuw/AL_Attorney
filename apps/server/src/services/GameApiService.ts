import type { Agent } from '@earendil-works/pi-agent-core';
import { GameContextStore } from '@ace-attorney/context-engine';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  TransitionRequest,
  TransitionResponse,
  EventRequest,
  ContextSnapshot,
  MayaChatRequest,
  MayaChatResponse,
  ExamineRequest,
  ExamineResponse,
  PressRequest,
  PressResponse,
  PresentRequest,
  PresentResponse,
  ChoiceRequest,
  ChoiceResponse,
  BacktrackRequest,
  BacktrackResponse,
  DialogLine,
  MayaIntent,
  TrialStateResponse,
  TrialAdvanceResponse,
  TrialObjectionRequest,
  TrialObjectionResponse,
  TrialReconstructRequest,
  TrialReconstructResponse,
  TrialBacktrackResponse,
} from '@ace-attorney/shared';
import { getCase, getEvidence } from '../data/caseData.js';
import { phaseContextSync } from '../gateway/PhaseContextSync.js';
import { agentFactory, collectAgentDialogue } from '../llm/AgentFactory.js';
import { createRoleAgent } from '../trial/trialAgentRunner.js';
import { TrialOrchestrator } from '../trial/TrialOrchestrator.js';
import { createDefaultDossier, dossierToPromptText } from '../dossier/defaultDossier.js';
import { DOSSIER_EDIT_PROMPT, parseDossierChatResponse } from '../dossier/dossierDialogue.js';

function createId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function pickMayaFallback(intent: MayaIntent): string {
  const caseData = getCase('case01');
  const responses = caseData.mayaResponses[intent] ?? caseData.mayaResponses.free_chat ?? [];
  if (!responses.length) return '……（真宵正在思考）';
  return responses[Math.floor(Math.random() * responses.length)]!;
}

function buildMayaPrompt(params: MayaChatRequest, store: GameContextStore): string {
  const parts: string[] = [];

  const intentHint =
    params.intent === 'analyze_evidence'
      ? '请分析当前关注的证物。'
      : params.intent === 'reconstruct_timeline'
        ? '请帮我还原案件时间线。'
        : params.intent === 'trial_hint'
          ? '请给出庭审提示（不要直接泄露答案）。'
          : params.intent === 'discuss_testimony'
            ? '请讨论当前证词中的矛盾。'
            : params.intent === 'edit_dossier'
              ? '成步堂正在指导你整理案情卷宗。根据指示更新卷宗内容，并用分段对话回应。'
              : '';
  if (intentHint) parts.push(intentHint);

  if (params.intent === 'edit_dossier') {
    parts.push('【当前卷宗】', dossierToPromptText(store.getCaseDossier()));
  }

  if (params.payload?.evidenceId) {
    const ev = store.getEvidence(params.payload.evidenceId);
    if (ev) {
      store.slices.investigation.evidenceNotes[ev.id] = params.userMessage;
      parts.push(`【当前证物】${ev.name}\n${ev.description}`);
    }
  }

  if (params.payload?.testimonyLineId) {
    const caseData = getCase(store.caseId);
    for (const witness of caseData.trial.witnesses) {
      const line = witness.testimony.find((t) => t.id === params.payload!.testimonyLineId);
      if (line) {
        parts.push(`【当前证词 · ${witness.name}】\n${line.text}`);
        break;
      }
    }
  }

  parts.push(params.userMessage);
  return parts.join('\n\n').trim();
}

interface SessionEntry {
  store: GameContextStore;
  mayaAgent: Agent;
  judgeAgent: Agent;
  prosecutorAgent: Agent;
  trial: TrialOrchestrator;
}

export class GameApiService {
  private sessions = new Map<string, SessionEntry>();

  private getEntry(sessionId: string): SessionEntry {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error('Session not found');
    return entry;
  }

  async createSession(params: CreateSessionRequest): Promise<CreateSessionResponse> {
    const sessionId = createId();
    const caseData = getCase(params.caseId);
    const initialDossier = createDefaultDossier(caseData.title);
    const store = new GameContextStore(sessionId, params.caseId, params.playerRole, initialDossier);
    const mayaAgent = agentFactory.create('maya', store);
    const judgeAgent = createRoleAgent('judge', store);
    const prosecutorAgent = createRoleAgent('prosecutor', store);
    const trial = new TrialOrchestrator(store, judgeAgent, prosecutorAgent);
    this.sessions.set(sessionId, { store, mayaAgent, judgeAgent, prosecutorAgent, trial });
    return { sessionId, context: store.toSnapshot() };
  }

  async transition(params: TransitionRequest): Promise<TransitionResponse> {
    const entry = this.getEntry(params.sessionId);
    const { store, mayaAgent } = entry;
    phaseContextSync.transition(store, params.toPhase);
    agentFactory.refreshSystemPrompt(mayaAgent, 'maya', store);
    if (params.toPhase === 'trial') {
      entry.trial.initTrial();
    }
    return { success: true, contextSnapshot: store.toSnapshot() };
  }

  async reportEvent(params: EventRequest): Promise<void> {
    const { store } = this.getEntry(params.sessionId);
    if (params.eventType === 'npc_met' && params.payload?.npcId) {
      const npcId = String(params.payload.npcId);
      if (!store.slices.prologue.npcsMet.includes(npcId)) {
        store.slices.prologue.npcsMet.push(npcId);
      }
    }
    if (params.eventType === 'dialog' && params.payload?.dialogId) {
      store.appendDialogue({
        phase: store.currentPhase,
        speaker: 'npc',
        speakerDisplay: 'NPC',
        text: `对话推进: ${params.payload.dialogId}`,
      });
    }
  }

  async getContext(sessionId: string): Promise<ContextSnapshot> {
    return this.getEntry(sessionId).store.toSnapshot();
  }

  async mayaChat(params: MayaChatRequest): Promise<MayaChatResponse> {
    const { store, mayaAgent } = this.getEntry(params.sessionId);
    const isDossier = params.intent === 'edit_dossier';

    const userMsg = {
      id: `u_${Date.now()}`,
      role: 'user' as const,
      content: params.userMessage,
      timestamp: Date.now(),
    };

    if (isDossier) {
      store.addDossierMessage(userMsg);
    } else {
      store.addMayaMessage(userMsg);
    }

    agentFactory.refreshSystemPrompt(mayaAgent, 'maya', store);
    if (isDossier) {
      mayaAgent.state.systemPrompt = `${mayaAgent.state.systemPrompt}\n\n${DOSSIER_EDIT_PROMPT}`;
    }

    const prompt = buildMayaPrompt(params, store);
    let reply: string;
    let segments: import('@ace-attorney/shared').DialogueSpeechSegment[] | undefined;
    let dossier: import('@ace-attorney/shared').CaseDossier | undefined;

    try {
      if (isDossier) {
        const raw = await collectAgentDialogue(mayaAgent, prompt);
        const parsed = parseDossierChatResponse(raw.raw || raw.reply);
        reply = parsed.reply;
        segments = parsed.segments;
        if (parsed.dossier) {
          store.setCaseDossier(parsed.dossier);
          dossier = store.getCaseDossier();
        }
      } else {
        const result = await collectAgentDialogue(mayaAgent, prompt);
        reply = result.reply;
        segments = result.dialogue.segments;
      }
    } catch (err) {
      console.error('[mayaChat] LLM error, using fallback:', err);
      reply = pickMayaFallback(params.intent);
    }

    if (!reply || reply === '……') {
      reply = pickMayaFallback(params.intent);
      segments = [{ text: reply }];
    }

    const mayaMsg = {
      id: `m_${Date.now()}`,
      role: 'maya' as const,
      content: reply,
      timestamp: Date.now(),
      segments,
    };

    if (isDossier) {
      store.addDossierMessage(mayaMsg);
    } else {
      store.addMayaMessage(mayaMsg);
      store.appendDialogue({
        phase: store.currentPhase,
        speaker: 'maya',
        speakerDisplay: '真宵',
        text: reply,
        metadata: { intent: params.intent },
      });
    }

    const hintLevel =
      params.intent === 'trial_hint' && store.slices.trial.hpRemaining <= 2 ? 'direct' : 'subtle';

    return {
      reply,
      segments,
      dossier,
      suggestedActions:
        params.intent === 'analyze_evidence' ? ['检查现场照片', '对比证人证词'] : undefined,
      hintLevel: params.intent === 'trial_hint' ? hintLevel : undefined,
    };
  }

  getDossierState(sessionId: string): import('@ace-attorney/shared').DossierStateResponse {
    const store = this.getEntry(sessionId).store;
    return {
      dossier: store.getCaseDossier(),
      dossierChatHistory: store.getDossierChatHistory(),
    };
  }

  async examineHotspot(params: ExamineRequest): Promise<ExamineResponse> {
    const { store } = this.getEntry(params.sessionId);
    const caseData = getCase(store.caseId);
    const hotspot = caseData.investigation.hotspots.find((h) => h.id === params.hotspotId);
    if (!hotspot) throw new Error('Hotspot not found');

    const dialogLines: DialogLine[] = [];
    if (hotspot.dialogId && caseData.investigation.dialogs[hotspot.dialogId]) {
      dialogLines.push(caseData.investigation.dialogs[hotspot.dialogId]);
    }

    let evidence;
    if (hotspot.evidenceId) {
      const item = getEvidence(hotspot.evidenceId);
      if (item) {
        store.importEvidence(item, { source: hotspot.id, phase: 'investigation' });
        evidence = item;
      }
    }

    if (hotspot.type === 'area' && hotspot.dialogId) {
      const dlg = caseData.investigation.dialogs[hotspot.dialogId];
      if (dlg) {
        store.importClue({
          id: `clue_${hotspot.id}`,
          title: hotspot.label ?? hotspot.id,
          description: dlg.text,
          sceneId: hotspot.sceneId,
        });
      }
    }

    if (!store.slices.investigation.examinedHotspots.includes(params.hotspotId)) {
      store.slices.investigation.examinedHotspots.push(params.hotspotId);
    }

    for (const dlg of dialogLines) {
      store.appendDialogue({
        phase: 'investigation',
        speaker: 'npc',
        speakerDisplay: dlg.speaker,
        text: dlg.text,
      });
    }

    return { dialog: dialogLines, evidence };
  }

  async pressTestimony(params: PressRequest): Promise<PressResponse> {
    const { store } = this.getEntry(params.sessionId);
    const caseData = getCase(store.caseId);
    const witness = caseData.trial.witnesses.find((w) => w.id === params.witnessId);
    const line = witness?.testimony.find((t) => t.id === params.lineId);

    const dialog: DialogLine[] = line?.pressResponse
      ? [
          {
            id: `press_${params.lineId}`,
            speaker: witness!.name,
            text: line.pressResponse,
            portrait: witness!.portrait,
          },
        ]
      : [
          {
            id: `press_${params.lineId}`,
            speaker: witness!.name,
            text: '……我已经说过了。',
            portrait: witness!.portrait,
          },
        ];

    store.slices.trial.pressHistory.push({ lineId: params.lineId, timestamp: Date.now() });
    store.appendDialogue({
      phase: 'trial',
      speaker: 'suspect',
      speakerDisplay: witness!.name,
      text: dialog[0]!.text,
      metadata: { witnessId: params.witnessId, lineId: params.lineId },
    });

    return { dialog };
  }

  async presentEvidence(params: PresentRequest): Promise<PresentResponse> {
    const { store } = this.getEntry(params.sessionId);
    const caseData = getCase(store.caseId);
    const witness = caseData.trial.witnesses.find((w) => w.id === params.witnessId);
    const line = witness?.testimony.find((t) => t.id === params.lineId);
    const rule = line?.presentEvidence?.find((p) => p.evidenceId === params.evidenceId);

    if (rule) {
      const successDialog = caseData.trialDialogs[rule.successDialogId];
      const dialog: DialogLine[] = successDialog
        ? [{ ...successDialog, portrait: successDialog.portrait }]
        : [
            {
              id: 'success',
              speaker: '成步堂龙一',
              text: '异议！证词与证物矛盾！',
              portrait: 'naruhodo',
            },
          ];

      store.slices.trial.contradictionsFound.push(params.lineId);
      store.slices.trial.presentHistory.push({
        lineId: params.lineId,
        evidenceId: params.evidenceId,
        success: true,
        timestamp: Date.now(),
      });

      store.appendDialogue({
        phase: 'trial',
        speaker: 'defenseAttorney',
        speakerDisplay: '成步堂',
        text: dialog[0]!.text,
        metadata: { witnessId: params.witnessId, lineId: params.lineId },
      });

      return { success: true, dialog, hpDelta: 0 };
    }

    store.slices.trial.presentHistory.push({
      lineId: params.lineId,
      evidenceId: params.evidenceId,
      success: false,
      timestamp: Date.now(),
    });

    return {
      success: false,
      dialog: [
        {
          id: 'fail',
          speaker: '法官',
          text: '辩护律师，这似乎与证词无关……',
          portrait: 'judge',
        },
      ],
      hpDelta: 0,
      mayaHint: pickMayaFallback('trial_hint'),
    };
  }

  getTrialState(sessionId: string): TrialStateResponse {
    return this.getEntry(sessionId).trial.getState();
  }

  advanceTrial(sessionId: string): TrialAdvanceResponse {
    const state = this.getEntry(sessionId).trial.advanceScript();
    return { state };
  }

  async submitTrialObjection(params: TrialObjectionRequest): Promise<TrialObjectionResponse> {
    const state = await this.getEntry(params.sessionId).trial.handleObjection(params);
    return { state };
  }

  async submitTrialReconstruct(params: TrialReconstructRequest): Promise<TrialReconstructResponse> {
    const result = await this.getEntry(params.sessionId).trial.handleReconstruct(params.input);
    return {
      state: result.state,
      stepCompleted: result.stepCompleted,
      allComplete: result.allComplete,
    };
  }

  trialBacktrackFromGuilty(sessionId: string): TrialBacktrackResponse {
    const state = this.getEntry(sessionId).trial.backtrackFromGuilty();
    return { state };
  }

  async submitChoice(_params: ChoiceRequest): Promise<ChoiceResponse> {
    return {
      success: true,
      dialog: [
        {
          id: 'choice_ok',
          speaker: '成步堂龙一',
          text: '就是这样！',
          portrait: 'naruhodo',
        },
      ],
      hpDelta: 0,
    };
  }

  async backtrackDialogue(params: BacktrackRequest): Promise<BacktrackResponse> {
    const { store, mayaAgent } = this.getEntry(params.sessionId);
    const activeSegments = store.backtrackDialogue(params.toSegmentId);
    const keepIds = new Set(activeSegments.map((s) => s.id));
    store.bridge.pruneDialogueAfterSegment(mayaAgent, keepIds);
    agentFactory.refreshSystemPrompt(mayaAgent, 'maya', store);
    return { success: true, activeSegments };
  }

  /** Expose store for direct TS manipulation (dev / extensions) */
  getStore(sessionId: string): GameContextStore {
    return this.getEntry(sessionId).store;
  }
}

export const gameApiService = new GameApiService();
