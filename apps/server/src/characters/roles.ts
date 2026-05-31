import type { CharacterRole } from '@ace-attorney/shared';

export type { CharacterRole };

export interface CharacterTemplate {
  role: CharacterRole;
  displayName: string;
  systemPrompt: string;
  constraints: string[];
}
