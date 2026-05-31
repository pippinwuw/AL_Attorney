import type { Agent } from '@earendil-works/pi-agent-core';
import type {
  EvidenceItem,
  ReconstructionStep,
  TestimonyLine,
  TrialStateResponse,
  TrialSubPhase,
  CourtSpeechMessage,
  DialogueSpeechSegment,
} from '@ace-attorney/shared';
import { segmentsToPlainText } from '@ace-attorney/shared';
import type { GameContextStore } from '@ace-attorney/context-engine';
import { getCase, getEvidence } from '../data/caseData.js';
import { buildTrialAgentPrompt } from './buildTrialFlowPrompt.js';
import { JUDGE_TOOL_NAMES } from './judgeTools.js';
import { createRoleAgent, makeJudgeAgentTools, runAgentTurn } from './trialAgentRunner.js';
import { parseSegmentedField, rawTextToDialogue } from '../llm/segmentedDialogue.js';

function toCourtMessage(
  speaker: string,
  portrait: string,
  raw: string,
  segments?: DialogueSpeechSegment[],
): CourtSpeechMessage {
  if (segments?.length) {
    return { speaker, portrait, text: segmentsToPlainText(segments), segments };
  }
  const parsed = rawTextToDialogue(raw);
  return { speaker, portrait, text: parsed.reply, segments: parsed.dialogue.segments };
}

function defaultTemplates() {
  return {
    wrong_line: '真宵：这段话似乎没什么漏洞……',
    wrong_evidence: '真宵：这个证物好像对不上呢！',
  };
}

function getTrialSlice(store: GameContextStore) {
  const t = store.slices.trial;
  if (!t.runtimePhase) {
    t.runtimePhase = 'opening';
    t.scriptIndex = 0;
    t.lineIndex = 0;
    t.completedObjections = [];
    t.reconstructionCompletedStepIds = [];
    t.currentWitnessId = 'w1';
  }
  return t;
}

function getWitness(store: GameContextStore) {
  const caseData = getCase(store.caseId);
  const witnessId = store.slices.trial.currentWitnessId ?? caseData.trial.witnesses[0]!.id;
  return caseData.trial.witnesses.find((w) => w.id === witnessId) ?? caseData.trial.witnesses[0]!;
}

function getObjectionableLines(witness: ReturnType<typeof getWitness>): TestimonyLine[] {
  return witness.testimony.filter((l) => l.objectionable);
}

function allObjectionsDone(store: GameContextStore): boolean {
  const witness = getWitness(store);
  const required = getObjectionableLines(witness).map((l) => l.id);
  const done = store.slices.trial.completedObjections ?? [];
  return required.every((id) => done.includes(id));
}

function evaluateStep(step: ReconstructionStep, input: string): boolean {
  const text = input.trim();
  if (!text) return false;
  if (step.keywords?.length) {
    return step.keywords.some((k) => text.includes(k));
  }
  return text.length >= 6;
}

export class TrialOrchestrator {
  private lastMessage?: TrialStateResponse['lastMessage'];
  private mayaHint?: string;
  private flow2Thread: string[] = [];

  constructor(
    private store: GameContextStore,
    private judgeAgent: Agent,
    private prosecutorAgent: Agent,
  ) {}

  initTrial(): void {
    const t = getTrialSlice(this.store);
    t.runtimePhase = 'opening';
    t.scriptIndex = 0;
    t.lineIndex = 0;
    t.completedObjections = [];
    t.reconstructionCompletedStepIds = [];
    t.currentWitnessId = getWitness(this.store).id;
    this.lastMessage = undefined;
    this.mayaHint = undefined;
    this.flow2Thread = [];
  }

  getState(): TrialStateResponse {
    const caseData = getCase(this.store.caseId);
    const witness = getWitness(this.store);
    const t = getTrialSlice(this.store);
    const phase = t.runtimePhase ?? 'opening';
    const lineIndex = t.lineIndex ?? 0;

    const prosecutionEvidence: EvidenceItem[] = (caseData.trial.prosecutionEvidence ?? [])
      .map((id) => getEvidence(id))
      .filter((e): e is EvidenceItem => Boolean(e));

    let scriptLine: TrialStateResponse['scriptLine'];
    if (phase === 'opening') {
      scriptLine = caseData.trial.opening[t.scriptIndex ?? 0];
    } else if (phase === 'prosecution_evidence') {
      scriptLine = caseData.trial.prosecutionScript?.[t.scriptIndex ?? 0];
    } else if (phase === 'closing') {
      scriptLine = caseData.trial.closing[t.scriptIndex ?? 0];
    } else if (phase === 'testimony') {
      scriptLine = {
        id: witness.testimony[lineIndex]?.id ?? 't',
        speaker: witness.name,
        text: witness.testimony[lineIndex]?.text ?? '',
        portrait: witness.portrait,
      };
    }

    let flow2: TrialStateResponse['flow2'];
    if (phase === 'flow2_explanation' || phase === 'flow2_reconstruction') {
      const line = witness.testimony.find((l) => l.id === t.currentObjectionLineId);
      const steps = line?.reconstructionSteps ?? [];
      const completed = t.reconstructionCompletedStepIds ?? [];
      const currentStep = steps.find((s) => !completed.includes(s.id));
      flow2 = {
        mode: phase === 'flow2_explanation' ? 'explanation' : 'reconstruction',
        lineId: line?.id ?? '',
        lineText: line?.text ?? '',
        currentStep,
        completedStepIds: completed,
      };
    }

    return {
      phase,
      witnessId: witness.id,
      witnessName: witness.name,
      testimonyLines: witness.testimony,
      currentLineIndex: lineIndex,
      scriptLine,
      prosecutionEvidence,
      flow2,
      lastMessage: this.lastMessage,
      mayaHint: this.mayaHint,
      hpRemaining: t.hpRemaining,
      completedObjections: t.completedObjections ?? [],
      allObjectionsComplete: allObjectionsDone(this.store),
      guilty: phase === 'guilty',
    };
  }

  advanceScript(): TrialStateResponse {
    const t = getTrialSlice(this.store);
    const caseData = getCase(this.store.caseId);
    this.mayaHint = undefined;

    if (t.runtimePhase === 'opening') {
      const idx = t.scriptIndex ?? 0;
      if (idx < caseData.trial.opening.length - 1) {
        t.scriptIndex = idx + 1;
      } else {
        t.runtimePhase = 'prosecution_evidence';
        t.scriptIndex = 0;
      }
      return this.getState();
    }

    if (t.runtimePhase === 'prosecution_evidence') {
      const scripts = caseData.trial.prosecutionScript ?? [];
      const idx = t.scriptIndex ?? 0;
      if (scripts.length && idx < scripts.length - 1) {
        t.scriptIndex = idx + 1;
      } else {
        t.runtimePhase = 'testimony';
        t.lineIndex = 0;
        t.scriptIndex = 0;
      }
      return this.getState();
    }

    if (t.runtimePhase === 'testimony') {
      const witness = getWitness(this.store);
      const idx = t.lineIndex ?? 0;
      if (idx < witness.testimony.length - 1) {
        t.lineIndex = idx + 1;
      } else if (allObjectionsDone(this.store)) {
        t.runtimePhase = 'closing';
        t.scriptIndex = 0;
      }
      return this.getState();
    }

    if (t.runtimePhase === 'closing') {
      const idx = t.scriptIndex ?? 0;
      if (idx < caseData.trial.closing.length - 1) {
        t.scriptIndex = idx + 1;
      }
      return this.getState();
    }

    return this.getState();
  }

  async handleObjection(params: {
    lineId: string;
    checkOnly?: boolean;
    evidenceId?: string;
    clueId?: string;
    explanation?: string;
  }): Promise<TrialStateResponse> {
    const t = getTrialSlice(this.store);
    const caseData = getCase(this.store.caseId);
    const witness = getWitness(this.store);
    const line = witness.testimony.find((l) => l.id === params.lineId);
    const templates = caseData.trial.errorTemplates ?? defaultTemplates();

    if (!line) throw new Error('证词不存在');

    if (params.checkOnly) {
      return this.getState();
    }

    if (!line.objectionable) {
      this.mayaHint = templates.wrong_line;
      return this.getState();
    }

    if (!params.evidenceId && !params.clueId) {
      t.runtimePhase = 'flow2_explanation';
      t.currentObjectionLineId = line.id;
      t.reconstructionCompletedStepIds = [];
      this.flow2Thread = [];
      this.mayaHint = undefined;
      return this.getState();
    }

    const evidenceOk =
      (params.evidenceId && line.acceptedEvidenceIds?.includes(params.evidenceId)) ||
      (params.clueId && line.acceptedClueIds?.includes(params.clueId));

    if (!evidenceOk) {
      this.mayaHint = templates.wrong_evidence;
      return this.getState();
    }

    const explanation = params.explanation?.trim() ?? '';
    if (!explanation) {
      this.mayaHint = '真宵：光出示证物还不够，要说清楚矛盾在哪里哦！';
      return this.getState();
    }

    const evName = params.evidenceId
      ? getEvidence(params.evidenceId)?.name ?? params.evidenceId
      : params.clueId ?? '';

    this.flow2Thread.push(`[辩护律师] 出示${evName}：${explanation}`);

    const judgeResult = await this.runJudgeTestimony(line, explanation, evName);

    if (judgeResult.verdict === 'guilty') {
      t.runtimePhase = 'guilty';
      t.hpRemaining = Math.max(0, t.hpRemaining - 1);
      this.lastMessage = judgeResult.message;
      return this.getState();
    }

    if (judgeResult.verdict === 'rejected') {
      this.lastMessage = judgeResult.message;
      this.flow2Thread.push(`[法官] ${judgeResult.message.text}`);
      return this.getState();
    }

    this.lastMessage = judgeResult.message;
    this.flow2Thread.push(`[法官] ${this.lastMessage.text}`);

    const prosMsg = await this.runProsecutorSupplement(line, explanation);
    if (prosMsg) {
      this.flow2Thread.push(`[检察官] ${prosMsg.text}`);
      this.lastMessage = prosMsg;
    }

    t.runtimePhase = 'flow2_reconstruction';
    t.reconstructionCompletedStepIds = [];
    return this.getState();
  }

  async handleReconstruct(input: string): Promise<{ state: TrialStateResponse; stepCompleted: boolean; allComplete: boolean }> {
    const t = getTrialSlice(this.store);
    const witness = getWitness(this.store);
    const line = witness.testimony.find((l) => l.id === t.currentObjectionLineId);
    if (!line?.reconstructionSteps?.length) {
      return { state: this.getState(), stepCompleted: false, allComplete: false };
    }

    const completed = t.reconstructionCompletedStepIds ?? [];
    const currentStep = line.reconstructionSteps.find((s) => !completed.includes(s.id));
    if (!currentStep) {
      return { state: this.getState(), stepCompleted: false, allComplete: true };
    }

    const ok = evaluateStep(currentStep, input);
    if (!ok) {
      this.lastMessage = toCourtMessage(
        '法官',
        'judge',
        currentStep.hint ?? '请再具体一些，围绕案发经过说明。',
      );
      return { state: this.getState(), stepCompleted: false, allComplete: false };
    }

    completed.push(currentStep.id);
    t.reconstructionCompletedStepIds = completed;
    this.flow2Thread.push(`[辩护律师·复原] ${input}`);

    const allComplete = line.reconstructionSteps.every((s) => completed.includes(s.id));
    const judgeMsg = await this.runJudgeReconstruction(line, input, completed, allComplete);
    this.lastMessage = judgeMsg;
    this.flow2Thread.push(`[法官] ${judgeMsg.text}`);

    if (allComplete) {
      const prosMsg = await this.runProsecutorSupplement(line, input);
      if (prosMsg) {
        this.lastMessage = prosMsg;
      }

      if (!t.completedObjections) t.completedObjections = [];
      if (!t.completedObjections.includes(line.id)) {
        t.completedObjections.push(line.id);
        t.contradictionsFound.push(line.id);
      }

      t.runtimePhase = 'testimony';
      t.currentObjectionLineId = undefined;
      t.reconstructionCompletedStepIds = [];
      this.flow2Thread = [];

      const idx = witness.testimony.findIndex((l) => l.id === line.id);
      t.lineIndex = idx >= 0 ? idx : t.lineIndex ?? 0;

      if (allObjectionsDone(this.store)) {
        const witnessLines = witness.testimony.length;
        if ((t.lineIndex ?? 0) >= witnessLines - 1) {
          t.runtimePhase = 'closing';
          t.scriptIndex = 0;
        }
      }
    }

    return { state: this.getState(), stepCompleted: true, allComplete };
  }

  backtrackFromGuilty(): TrialStateResponse {
    const t = getTrialSlice(this.store);
    t.runtimePhase = 'testimony';
    t.hpRemaining = Math.min(5, t.hpRemaining + 1);
    this.lastMessage = toCourtMessage('法官', 'judge', '本庭准许辩护方重新进行询问。');
    return this.getState();
  }

  private async runJudgeTestimony(
    line: TestimonyLine,
    explanation: string,
    evidenceName: string,
  ): Promise<{ verdict: 'valid' | 'rejected' | 'guilty'; message: CourtSpeechMessage }> {
    const captured: { name: string; args: Record<string, unknown> }[] = [];
    this.judgeAgent.state.tools = makeJudgeAgentTools((name, args) => captured.push({ name, args }));

    const witness = getWitness(this.store);
    const systemPrompt = buildTrialAgentPrompt('judge', this.store, {
      phase: 'Flow2·评价辩护说明',
      witnessName: witness.name,
      currentLine: line,
      explanation,
      evidenceName,
      thread: this.flow2Thread.join('\n'),
    });

    try {
      const { text, segments, toolCalls } = await runAgentTurn(
        this.judgeAgent,
        systemPrompt,
        `请裁定辩护方说明是否成立。\n证词：${line.text}\n说明：${explanation}`,
      );
      const calls = toolCalls.length ? toolCalls : captured;
      const defaultMsg = toCourtMessage('法官', 'judge', text, segments);

      for (const call of calls) {
        if (call.name === JUDGE_TOOL_NAMES.testimonyValid) {
          return {
            verdict: 'valid',
            message: defaultMsg.text
              ? defaultMsg
              : toCourtMessage('法官', 'judge', '本庭接受辩护方的说明。'),
          };
        }
        if (call.name === JUDGE_TOOL_NAMES.testimonyRejected) {
          const severe = Boolean(call.args.severe);
          const fb = String(call.args.feedback ?? text ?? '请更具体地说明矛盾。');
          const fbParsed = parseSegmentedField(fb);
          return {
            verdict: severe ? 'guilty' : 'rejected',
            message: toCourtMessage('法官', 'judge', fb, fbParsed.segments),
          };
        }
        if (call.name === JUDGE_TOOL_NAMES.verdictPronounced) {
          const reason = String(call.args.reason ?? text ?? '本庭宣判：被告人有罪。');
          const reasonParsed = parseSegmentedField(reason);
          return {
            verdict: 'guilty',
            message: toCourtMessage('法官', 'judge', reason, reasonParsed.segments),
          };
        }
      }

      if (defaultMsg.text && defaultMsg.text !== '……') {
        return { verdict: 'valid', message: defaultMsg };
      }
    } catch (err) {
      console.error('[TrialOrchestrator] judge testimony error:', err);
    }

    return this.fallbackTestimonyJudge(explanation, line);
  }

  private fallbackTestimonyJudge(
    explanation: string,
    line: TestimonyLine,
  ): { verdict: 'valid' | 'rejected' | 'guilty'; message: CourtSpeechMessage } {
    const hasKeywords = ['照片', '电梯', '三楼', '矛盾', '一楼', '不在', '不可能'].some((k) =>
      explanation.includes(k),
    );
    if (explanation.length >= 12 && hasKeywords) {
      return {
        verdict: 'valid',
        message: toCourtMessage('法官', 'judge', '本庭认为辩护方的说明具有合理依据，请继续还原案发经过。'),
      };
    }
    if (explanation.length < 8) {
      return {
        verdict: 'rejected',
        message: toCourtMessage('法官', 'judge', '辩护律师，请更清楚地说明证物与证词之间的矛盾。'),
      };
    }
    return {
      verdict: 'rejected',
      message: toCourtMessage(
        '法官',
        'judge',
        `请具体指出「${line.text.slice(0, 12)}…」与所出示证物的矛盾。`,
      ),
    };
  }

  private async runJudgeReconstruction(
    line: TestimonyLine,
    input: string,
    completedIds: string[],
    allComplete: boolean,
  ): Promise<CourtSpeechMessage> {
    const witness = getWitness(this.store);
    const steps = line.reconstructionSteps ?? [];
    const newlyDone = steps.filter((s) => completedIds.includes(s.id)).map((s) => s.id);

    try {
      this.judgeAgent.state.tools = makeJudgeAgentTools(() => {});
      const systemPrompt = buildTrialAgentPrompt('judge', this.store, {
        phase: 'Flow2·复原进度',
        witnessName: witness.name,
        currentLine: line,
        reconstructionSteps: steps,
        completedStepIds: completedIds,
        thread: this.flow2Thread.join('\n'),
      });

      const { text, segments, toolCalls } = await runAgentTurn(
        this.judgeAgent,
        systemPrompt,
        `玩家本轮复原：${input}\n请调用 reconstruction_stage 反馈进度。allComplete=${allComplete}`,
      );

      const reconCall = toolCalls.find((c) => c.name === JUDGE_TOOL_NAMES.reconstructionStage);
      if (reconCall) {
        const fb = String(reconCall.args.feedback ?? text);
        const fbParsed = parseSegmentedField(fb);
        return toCourtMessage('法官', 'judge', fb, fbParsed.segments.length ? fbParsed.segments : segments);
      }
      if (text) return toCourtMessage('法官', 'judge', text, segments);
    } catch (err) {
      console.error('[TrialOrchestrator] judge reconstruction error:', err);
    }

    const step = steps.find((s) => newlyDone.includes(s.id) && s.id === completedIds[completedIds.length - 1]);
    if (allComplete) {
      return toCourtMessage('法官', 'judge', '本庭记录：辩护方已完成本案关键经过的还原。质询继续。');
    }
    return toCourtMessage('法官', 'judge', `本庭记录：${step?.prompt ?? '该环节'} 已完成。请继续下一项还原。`);
  }

  private async runProsecutorSupplement(
    line: TestimonyLine,
    context: string,
  ): Promise<CourtSpeechMessage | null> {
    try {
      const witness = getWitness(this.store);
      const systemPrompt = buildTrialAgentPrompt('prosecutor', this.store, {
        phase: '法官裁定后补充',
        witnessName: witness.name,
        currentLine: line,
        thread: this.flow2Thread.join('\n'),
      });
      const { text, segments } = await runAgentTurn(
        this.prosecutorAgent,
        systemPrompt,
        `法官已裁定。请发表一句简短补充（不影响结果）。背景：${context.slice(0, 200)}`,
      );
      const msg = toCourtMessage('检察官', 'prosecutor', text.slice(0, 200) || '……本席没有异议。', segments);
      return msg.text ? msg : null;
    } catch {
      return toCourtMessage('检察官', 'prosecutor', '……本席没有异议。');
    }
  }
}
