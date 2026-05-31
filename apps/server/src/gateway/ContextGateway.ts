import type { GamePhase } from '@ace-attorney/shared';
import type { GameContextStore } from '@ace-attorney/context-engine';

const PHASE_VISIBILITY: Record<GamePhase, GamePhase[]> = {
  prologue: ['prologue'],
  investigation: ['prologue', 'investigation'],
  trial: ['prologue', 'investigation', 'trial'],
  verdict: ['prologue', 'investigation', 'trial', 'verdict'],
};

export function filterVisiblePhases(current: GamePhase): GamePhase[] {
  return PHASE_VISIBILITY[current] ?? [current];
}

export function canAccessPhase(current: GamePhase, target: GamePhase): boolean {
  return filterVisiblePhases(current).includes(target);
}

export function buildPromptContextSummary(store: GameContextStore): string {
  const visible = filterVisiblePhases(store.currentPhase);
  const parts: string[] = [];
  if (visible.includes('prologue') && store.slices.prologue.summary) {
    parts.push(store.slices.prologue.summary);
  }
  return parts.join('\n');
}
