import type { GamePhase } from '@ace-attorney/shared';
import type { GameContextStore } from '@ace-attorney/context-engine';

export class PhaseContextSync {
  transition(store: GameContextStore, toPhase: GamePhase): void {
    const from = store.currentPhase;

    if (from === 'prologue' && toPhase === 'investigation') {
      store.slices.prologue.summary = '案件背景：被告被指控在电梯案中作案，需调查现场。';
      store.addKnownFact('案件：逆转的电梯 — 被告被指控出现在犯罪现场');
    }

    if (from === 'investigation' && toPhase === 'trial') {
      for (const e of store.listEvidence('investigation')) {
        store.addKnownFact(`证物：${e.name} — ${e.description}`);
      }
      for (const c of store.listClues()) {
        store.addKnownFact(`线索：${c.title} — ${c.description}`);
      }
    }

    store.setPhase(toPhase);
  }
}

export const phaseContextSync = new PhaseContextSync();
