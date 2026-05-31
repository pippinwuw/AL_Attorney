import type {
  GamePhase,
  PlayerRole,
  EvidenceItem,
  SessionContext,
  MayaMessage,
  DialogueSegment,
  ClueEntry,
  CaseDossier,
} from '@ace-attorney/shared';
import { DialogueSegmentLog } from './DialogueSegmentLog.js';
import { ClueEvidenceRegistry } from './ClueEvidenceRegistry.js';
import { PiContextBridge } from './PiContextBridge.js';
import type { ClueInput, EvidenceMeta, AppendDialogueInput } from './types.js';

export class GameContextStore {
  readonly sessionId: string;
  readonly caseId: string;
  playerRole: PlayerRole;
  currentPhase: GamePhase;
  readonly bridge = new PiContextBridge();

  private registry = new ClueEvidenceRegistry();
  private dialogueLog = new DialogueSegmentLog();
  private knownFacts: string[] = [];
  private mayaChatHistory: MayaMessage[] = [];
  private dossierChatHistory: MayaMessage[] = [];
  private caseDossier: CaseDossier;
  private npcImpressions: Record<string, string> = {};
  private playerChoiceLog: SessionContext['global']['playerChoiceLog'] = [];

  slices: SessionContext['slices'] = {
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
  };

  constructor(sessionId: string, caseId: string, playerRole: PlayerRole, initialDossier?: CaseDossier) {
    this.sessionId = sessionId;
    this.caseId = caseId;
    this.playerRole = playerRole;
    this.currentPhase = 'prologue';
    this.caseDossier = initialDossier ?? {
      title: '案情卷宗',
      sections: [{ id: 'overview', heading: '案件概要', body: '（待整理）' }],
      updatedAt: Date.now(),
    };
  }

  setPhase(phase: GamePhase): void {
    this.currentPhase = phase;
  }

  // --- Evidence ---
  importEvidence(item: EvidenceItem, meta?: Partial<EvidenceMeta>): void {
    this.registry.importEvidence(item, {
      phase: meta?.phase ?? this.currentPhase,
      source: meta?.source,
    });
  }

  updateEvidenceDescription(id: string, description: string): void {
    this.registry.updateEvidenceDescription(id, description);
  }

  getEvidence(id: string): EvidenceItem | undefined {
    return this.registry.getEvidencePublic(id);
  }

  getEvidenceMeta(id: string): EvidenceMeta | undefined {
    return this.registry.getEvidenceMeta(id);
  }

  listEvidence(phase?: GamePhase): EvidenceItem[] {
    return this.registry.listEvidence(phase ?? this.currentPhase);
  }

  // --- Clues ---
  importClue(clue: ClueInput): ClueEntry {
    return this.registry.importClue(clue, this.currentPhase);
  }

  updateClueDescription(id: string, description: string): void {
    this.registry.updateClueDescription(id, description);
  }

  listClues(): ClueEntry[] {
    return this.registry.listClues(this.currentPhase);
  }

  // --- Dialogue ---
  appendDialogue(input: AppendDialogueInput): DialogueSegment {
    return this.dialogueLog.append(input);
  }

  backtrackDialogue(toSegmentId: string): DialogueSegment[] {
    return this.dialogueLog.backtrack(toSegmentId);
  }

  getActiveDialogue(): DialogueSegment[] {
    return this.dialogueLog.getActiveTail();
  }

  getAllDialogue(): DialogueSegment[] {
    return this.dialogueLog.getAll();
  }

  // --- Facts & history ---
  addKnownFact(fact: string): void {
    if (!this.knownFacts.includes(fact)) this.knownFacts.push(fact);
  }

  getKnownFacts(): string[] {
    return [...this.knownFacts];
  }

  addMayaMessage(msg: MayaMessage): void {
    this.mayaChatHistory.push(msg);
  }

  getMayaChatHistory(): MayaMessage[] {
    return [...this.mayaChatHistory];
  }

  getCaseDossier(): CaseDossier {
    return { ...this.caseDossier, sections: this.caseDossier.sections.map((s) => ({ ...s })) };
  }

  setCaseDossier(dossier: CaseDossier): void {
    this.caseDossier = { ...dossier, updatedAt: Date.now() };
  }

  addDossierMessage(msg: MayaMessage): void {
    this.dossierChatHistory.push(msg);
  }

  getDossierChatHistory(): MayaMessage[] {
    return [...this.dossierChatHistory];
  }

  toSessionContext(): SessionContext {
    return {
      sessionId: this.sessionId,
      caseId: this.caseId,
      playerRole: this.playerRole,
      currentPhase: this.currentPhase,
      slices: { ...this.slices },
      global: {
        knownFacts: [...this.knownFacts],
        evidenceCollected: this.registry.listEvidence(),
        npcImpressions: { ...this.npcImpressions },
        playerChoiceLog: [...this.playerChoiceLog],
        mayaChatHistory: [...this.mayaChatHistory],
        caseDossier: this.getCaseDossier(),
        dossierChatHistory: [...this.dossierChatHistory],
      },
    };
  }

  toSnapshot() {
    return {
      sessionId: this.sessionId,
      currentPhase: this.currentPhase,
      playerRole: this.playerRole,
      knownFacts: [...this.knownFacts],
      evidenceCollected: this.registry.listEvidence(),
    };
  }
}
