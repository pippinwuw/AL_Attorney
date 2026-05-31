export type GamePhase = 'prologue' | 'investigation' | 'trial' | 'verdict';

export type {
  DialogueSpeechSegment,
  SegmentedDialogueJson,
  CourtSpeechMessage,
} from './segmentedDialogue.js';
export { segmentsToPlainText } from './segmentedDialogue.js';

import type { DialogueSpeechSegment, CourtSpeechMessage } from './segmentedDialogue.js';

export type PlayerRole = 'naruhodo' | 'maya';

/** LLM / 对话角色模板 ID */
export type CharacterRole =
  | 'maya'
  | 'prosecutor'
  | 'judge'
  | 'defenseAttorney'
  | 'suspect';

export interface ClueEntry {
  id: string;
  title: string;
  description: string;
  sceneId?: string;
  importedAtPhase: GamePhase;
}

export interface DialogueSegment {
  id: string;
  parentId: string | null;
  phase: GamePhase;
  speaker: CharacterRole | 'player' | 'npc';
  speakerDisplay: string;
  text: string;
  timestamp: number;
  metadata?: {
    witnessId?: string;
    lineId?: string;
    intent?: string;
  };
}

export interface BacktrackRequest {
  sessionId: string;
  toSegmentId: string;
}

export interface BacktrackResponse {
  success: boolean;
  activeSegments: DialogueSegment[];
}

export type PortraitId = 'naruhodo' | 'maya' | string;

export interface DialogChoice {
  id: string;
  label: string;
  nextId: string;
}

export interface DialogLine {
  id: string;
  speaker: string;
  text: string;
  portrait?: PortraitId;
  background?: string;
  choices?: DialogChoice[];
  nextId?: string;
  action?: 'goto_investigation' | 'goto_trial' | 'goto_verdict';
}

export interface EvidenceItem {
  id: string;
  name: string;
  description: string;
  image?: string;
}

export interface Hotspot {
  id: string;
  sceneId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'item' | 'area' | 'npc';
  label?: string;
  evidenceId?: string;
  dialogId?: string;
  once?: boolean;
}

export interface Scene {
  id: string;
  name: string;
  background: string;
  unlocked?: boolean;
}

export interface PresentEvidenceRule {
  evidenceId: string;
  successDialogId: string;
  failPenalty?: boolean;
}

export interface ReconstructionStep {
  id: string;
  prompt: string;
  keywords?: string[];
  hint?: string;
}

export interface TestimonyLine {
  id: string;
  text: string;
  pressResponse?: string;
  presentEvidence?: PresentEvidenceRule[];
  /** 是否可被异议打断 */
  objectionable?: boolean;
  /** Flow2 接受的证物 ID */
  acceptedEvidenceIds?: string[];
  /** Flow2 接受的线索 ID */
  acceptedClueIds?: string[];
  /** Flow2 复原分步 checklist */
  reconstructionSteps?: ReconstructionStep[];
}

export interface Witness {
  id: string;
  name: string;
  portrait?: PortraitId;
  testimony: TestimonyLine[];
}

export interface TimelineEvent {
  id: string;
  time: string;
  description: string;
}

export type TrialSubPhase =
  | 'opening'
  | 'prosecution_evidence'
  | 'testimony'
  | 'flow2_explanation'
  | 'flow2_reconstruction'
  | 'interstitial'
  | 'cross_exam'
  | 'present_evidence'
  | 'choice_prompt'
  | 'breakdown'
  | 'penalty'
  | 'closing'
  | 'guilty';

export type TrialErrorTemplateKey = 'wrong_line' | 'wrong_evidence';

export interface TrialErrorTemplates {
  wrong_line: string;
  wrong_evidence: string;
}

export type MayaIntent =
  | 'free_chat'
  | 'analyze_evidence'
  | 'reconstruct_timeline'
  | 'trial_hint'
  | 'discuss_testimony'
  | 'edit_dossier';

export interface CaseDossierSection {
  id: string;
  heading: string;
  body: string;
}

/** 真宵维护的案情卷宗 */
export interface CaseDossier {
  title: string;
  sections: CaseDossierSection[];
  updatedAt: number;
}

export interface MayaMessage {
  id: string;
  role: 'user' | 'maya';
  content: string;
  timestamp: number;
  /** LLM 分段台词（有则优先逐段展示） */
  segments?: DialogueSpeechSegment[];
}

export interface ChoiceRecord {
  id: string;
  choiceId: string;
  timestamp: number;
}

export interface PrologueContext {
  scenesVisited: string[];
  npcsMet: string[];
  summary?: string;
}

export interface InvestigationContext {
  currentSceneId: string;
  examinedHotspots: string[];
  crimeTimeline: TimelineEvent[];
  evidenceNotes: Record<string, string>;
}

export interface TrialContext {
  currentWitnessId?: string;
  testimonyProgress: Record<string, number>;
  contradictionsFound: string[];
  hpRemaining: number;
  pressHistory: { lineId: string; timestamp: number }[];
  presentHistory: { lineId: string; evidenceId: string; success: boolean; timestamp: number }[];
  runtimePhase?: TrialSubPhase;
  scriptIndex?: number;
  lineIndex?: number;
  completedObjections?: string[];
  currentObjectionLineId?: string;
  reconstructionCompletedStepIds?: string[];
}

export interface SessionContext {
  sessionId: string;
  caseId: string;
  playerRole: PlayerRole;
  currentPhase: GamePhase;
  slices: {
    prologue: PrologueContext;
    investigation: InvestigationContext;
    trial: TrialContext;
  };
  global: {
    knownFacts: string[];
    evidenceCollected: EvidenceItem[];
    npcImpressions: Record<string, string>;
    playerChoiceLog: ChoiceRecord[];
    mayaChatHistory: MayaMessage[];
    caseDossier: CaseDossier;
    dossierChatHistory: MayaMessage[];
  };
}

export interface ContextSnapshot {
  sessionId: string;
  currentPhase: GamePhase;
  playerRole: PlayerRole;
  knownFacts: string[];
  evidenceCollected: EvidenceItem[];
}

export interface CreateSessionRequest {
  caseId: string;
  playerRole: PlayerRole;
}

export interface CreateSessionResponse {
  sessionId: string;
  context: ContextSnapshot;
}

export interface TransitionRequest {
  sessionId: string;
  toPhase: GamePhase;
}

export interface TransitionResponse {
  success: boolean;
  contextSnapshot: ContextSnapshot;
}

export interface EventRequest {
  sessionId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}

export interface MayaChatRequest {
  sessionId: string;
  intent: MayaIntent;
  userMessage: string;
  payload?: { evidenceId?: string; testimonyLineId?: string };
}

export interface MayaChatResponse {
  reply: string;
  segments?: DialogueSpeechSegment[];
  dossier?: CaseDossier;
  extractedFacts?: string[];
  suggestedActions?: string[];
  hintLevel?: 'subtle' | 'direct';
}

export interface DossierStateResponse {
  dossier: CaseDossier;
  dossierChatHistory: MayaMessage[];
}

export interface ExamineRequest {
  sessionId: string;
  hotspotId: string;
}

export interface ExamineResponse {
  dialog: DialogLine[];
  evidence?: EvidenceItem;
}

export interface PressRequest {
  sessionId: string;
  witnessId: string;
  lineId: string;
}

export interface PressResponse {
  dialog: DialogLine[];
}

export interface PresentRequest {
  sessionId: string;
  witnessId: string;
  lineId: string;
  evidenceId: string;
}

export interface PresentResponse {
  success: boolean;
  dialog: DialogLine[];
  hpDelta: number;
  mayaHint?: string;
}

export interface ChoiceRequest {
  sessionId: string;
  choiceId: string;
  witnessId?: string;
}

export interface ChoiceResponse {
  success: boolean;
  dialog: DialogLine[];
  hpDelta: number;
}

export interface TrialStateResponse {
  phase: TrialSubPhase;
  witnessId: string;
  witnessName: string;
  testimonyLines: TestimonyLine[];
  currentLineIndex: number;
  scriptLine?: DialogLine;
  prosecutionEvidence: EvidenceItem[];
  flow2?: {
    mode: 'explanation' | 'reconstruction';
    lineId: string;
    lineText: string;
    currentStep?: ReconstructionStep;
    completedStepIds: string[];
  };
  lastMessage?: CourtSpeechMessage;
  mayaHint?: string;
  hpRemaining: number;
  completedObjections: string[];
  allObjectionsComplete: boolean;
  guilty: boolean;
}

export interface TrialAdvanceResponse {
  state: TrialStateResponse;
}

export interface TrialObjectionRequest {
  sessionId: string;
  lineId: string;
  checkOnly?: boolean;
  evidenceId?: string;
  clueId?: string;
  explanation?: string;
}

export interface TrialObjectionResponse {
  state: TrialStateResponse;
  canObject?: boolean;
}

export interface TrialReconstructRequest {
  sessionId: string;
  input: string;
}

export interface TrialReconstructResponse {
  state: TrialStateResponse;
  stepCompleted?: boolean;
  allComplete?: boolean;
}

export interface TrialBacktrackResponse {
  state: TrialStateResponse;
}

export interface CaseData {
  id: string;
  title: string;
  prologue: {
    startId: string;
    dialogs: Record<string, DialogLine>;
  };
  investigation: {
    scenes: Scene[];
    hotspots: Hotspot[];
    dialogs: Record<string, DialogLine>;
    requiredEvidence: string[];
  };
  trial: {
    opening: DialogLine[];
    prosecutionEvidence?: string[];
    prosecutionScript?: DialogLine[];
    witnesses: Witness[];
    closing: DialogLine[];
    errorTemplates?: TrialErrorTemplates;
    choices?: { id: string; label: string; correct: boolean; dialog: DialogLine[] }[];
  };
  verdict: {
    title: string;
    text: string;
  };
  mayaResponses: Partial<Record<MayaIntent, string[]>>;
}
