import type { GamePhase, CharacterRole, DialogueSegment } from '@ace-attorney/shared';

export type { GamePhase, CharacterRole, DialogueSegment };

export interface EvidenceMeta {
  source?: string;
  phase: GamePhase;
}

export interface ClueInput {
  id: string;
  title: string;
  description: string;
  sceneId?: string;
}

export interface AppendDialogueInput {
  parentId?: string | null;
  phase: GamePhase;
  speaker: CharacterRole | 'player' | 'npc';
  speakerDisplay: string;
  text: string;
  metadata?: DialogueSegment['metadata'];
}
