import type {
  TrialObjectionRequest,
  TrialReconstructRequest,
  TrialStateResponse,
  ReconstructionStep,
} from '@ace-attorney/shared';
import { case01 } from '@/data/mock/caseData';

const states = new Map<string, TrialStateResponse>();

function templates() {
  return case01.trial.errorTemplates ?? {
    wrong_line: '真宵：这段话似乎没什么漏洞……',
    wrong_evidence: '真宵：这个证物好像对不上呢！',
  };
}

function witness() {
  return case01.trial.witnesses[0]!;
}

function objectionableIds(): string[] {
  return witness().testimony.filter((l) => l.objectionable).map((l) => l.id);
}

function evaluateStep(step: ReconstructionStep, input: string): boolean {
  if (step.keywords?.length) return step.keywords.some((k) => input.includes(k));
  return input.trim().length >= 6;
}

function baseState(): TrialStateResponse {
  return {
    phase: 'opening',
    witnessId: witness().id,
    witnessName: witness().name,
    testimonyLines: witness().testimony,
    currentLineIndex: 0,
    scriptLine: case01.trial.opening[0],
    prosecutionEvidence: (case01.trial.prosecutionEvidence ?? [])
      .map((id) => case01.evidenceMap[id])
      .filter(Boolean) as TrialStateResponse['prosecutionEvidence'],
    hpRemaining: 5,
    completedObjections: [],
    allObjectionsComplete: false,
    guilty: false,
  };
}

export function mockInitTrial(sessionId: string): void {
  states.set(sessionId, baseState());
}

export function mockGetTrialState(sessionId: string): TrialStateResponse {
  if (!states.has(sessionId)) mockInitTrial(sessionId);
  return { ...states.get(sessionId)! };
}

export function mockAdvanceTrial(sessionId: string): TrialStateResponse {
  const s = mockGetTrialState(sessionId);
  const t = { ...s };

  if (t.phase === 'opening') {
    const idx = case01.trial.opening.findIndex((l) => l.id === t.scriptLine?.id);
    if (idx < case01.trial.opening.length - 1) {
      t.scriptLine = case01.trial.opening[idx + 1];
    } else {
      t.phase = 'prosecution_evidence';
      t.scriptLine = case01.trial.prosecutionScript?.[0];
    }
  } else if (t.phase === 'prosecution_evidence') {
    t.phase = 'testimony';
    t.currentLineIndex = 0;
    t.scriptLine = {
      id: witness().testimony[0]!.id,
      speaker: witness().name,
      text: witness().testimony[0]!.text,
      portrait: witness().portrait,
    };
  } else if (t.phase === 'testimony') {
    if (t.currentLineIndex < witness().testimony.length - 1) {
      t.currentLineIndex += 1;
      const line = witness().testimony[t.currentLineIndex]!;
      t.scriptLine = { id: line.id, speaker: witness().name, text: line.text, portrait: witness().portrait };
    } else if (t.completedObjections.length >= objectionableIds().length) {
      t.phase = 'closing';
      t.scriptLine = case01.trial.closing[0];
    }
  } else if (t.phase === 'closing') {
    const idx = case01.trial.closing.findIndex((l) => l.id === t.scriptLine?.id);
    if (idx < case01.trial.closing.length - 1) t.scriptLine = case01.trial.closing[idx + 1];
  }

  states.set(sessionId, t);
  return t;
}

export function mockTrialObjection(params: TrialObjectionRequest): TrialStateResponse {
  const t = mockGetTrialState(params.sessionId);
  const line = witness().testimony.find((l) => l.id === params.lineId);
  if (!line) return t;

  if (!line.objectionable) {
    t.mayaHint = templates().wrong_line;
    states.set(params.sessionId, { ...t });
    return t;
  }

  if (!params.evidenceId && !params.clueId) {
    t.phase = 'flow2_explanation';
    t.flow2 = {
      mode: 'explanation',
      lineId: line.id,
      lineText: line.text,
      completedStepIds: [],
    };
    states.set(params.sessionId, { ...t });
    return t;
  }

  const ok = params.evidenceId && line.acceptedEvidenceIds?.includes(params.evidenceId);
  if (!ok) {
    t.mayaHint = templates().wrong_evidence;
    states.set(params.sessionId, { ...t });
    return t;
  }

  const explanation = params.explanation?.trim() ?? '';
  if (explanation.length < 8) {
    t.lastMessage = { speaker: '法官', text: '请更清楚地说明矛盾。', portrait: 'judge' };
    states.set(params.sessionId, { ...t });
    return t;
  }

  t.lastMessage = { speaker: '法官', text: '本庭接受说明，请还原案发经过。', portrait: 'judge' };
  t.phase = 'flow2_reconstruction';
  t.flow2 = {
    mode: 'reconstruction',
    lineId: line.id,
    lineText: line.text,
    currentStep: line.reconstructionSteps?.[0],
    completedStepIds: [],
  };
  states.set(params.sessionId, { ...t });
  return t;
}

export function mockTrialReconstruct(params: TrialReconstructRequest): {
  state: TrialStateResponse;
  stepCompleted: boolean;
  allComplete: boolean;
} {
  const t = mockGetTrialState(params.sessionId);
  const line = witness().testimony.find((l) => l.id === t.flow2?.lineId);
  const steps = line?.reconstructionSteps ?? [];
  const completed = [...(t.flow2?.completedStepIds ?? [])];
  const current = steps.find((s) => !completed.includes(s.id));

  if (!current || !evaluateStep(current, params.input)) {
    t.lastMessage = { speaker: '法官', text: current?.hint ?? '请再具体一些。', portrait: 'judge' };
    states.set(params.sessionId, { ...t });
    return { state: t, stepCompleted: false, allComplete: false };
  }

  completed.push(current.id);
  const allComplete = steps.every((s) => completed.includes(s.id));
  t.flow2 = {
    mode: 'reconstruction',
    lineId: line!.id,
    lineText: line!.text,
    currentStep: steps.find((s) => !completed.includes(s.id)),
    completedStepIds: completed,
  };
  t.lastMessage = {
    speaker: '法官',
    text: allComplete ? '还原完成，质询继续。' : '记录完成，请继续。',
    portrait: 'judge',
  };

  if (allComplete) {
    t.completedObjections = [...t.completedObjections, line!.id];
    t.phase = 'testimony';
    t.currentLineIndex = witness().testimony.findIndex((l) => l.id === line!.id);
    t.flow2 = undefined;
    t.allObjectionsComplete = t.completedObjections.length >= objectionableIds().length;
    if (t.allObjectionsComplete && t.currentLineIndex >= witness().testimony.length - 1) {
      t.phase = 'closing';
      t.scriptLine = case01.trial.closing[0];
    }
  }

  states.set(params.sessionId, { ...t });
  return { state: t, stepCompleted: true, allComplete };
}

export function mockTrialBacktrack(sessionId: string): TrialStateResponse {
  const t = mockGetTrialState(sessionId);
  t.phase = 'testimony';
  t.guilty = false;
  t.hpRemaining = Math.min(5, t.hpRemaining + 1);
  states.set(sessionId, t);
  return t;
}
