import type { EvidenceItem, ClueEntry, GamePhase } from '@ace-attorney/shared';
import type { ClueInput, EvidenceMeta } from './types.js';

export class ClueEvidenceRegistry {
  private evidence = new Map<string, EvidenceItem & { meta: EvidenceMeta }>();
  private clues = new Map<string, ClueEntry>();

  importEvidence(item: EvidenceItem, meta: EvidenceMeta): void {
    this.evidence.set(item.id, { ...item, meta });
  }

  updateEvidenceDescription(id: string, description: string): void {
    const item = this.evidence.get(id);
    if (item) item.description = description;
  }

  getEvidence(id: string): (EvidenceItem & { meta: EvidenceMeta }) | undefined {
    return this.evidence.get(id);
  }

  getEvidenceMeta(id: string): EvidenceMeta | undefined {
    return this.evidence.get(id)?.meta;
  }

  getEvidencePublic(id: string): EvidenceItem | undefined {
    const item = this.evidence.get(id);
    if (!item) return undefined;
    const { meta: _meta, ...rest } = item;
    return rest;
  }

  listEvidence(phase?: GamePhase): EvidenceItem[] {
    const items = [...this.evidence.values()];
    if (!phase) return items.map(({ meta: _m, ...e }) => e);
    return items
      .filter((e) => this.isPhaseVisible(e.meta.phase, phase))
      .map(({ meta: _m, ...e }) => e);
  }

  importClue(clue: ClueInput, phase: GamePhase): ClueEntry {
    const entry: ClueEntry = {
      ...clue,
      importedAtPhase: phase,
    };
    this.clues.set(clue.id, entry);
    return entry;
  }

  updateClueDescription(id: string, description: string): void {
    const clue = this.clues.get(id);
    if (clue) clue.description = description;
  }

  listClues(phase?: GamePhase): ClueEntry[] {
    const all = [...this.clues.values()];
    if (!phase) return all;
    return all.filter((c) => this.isPhaseVisible(c.importedAtPhase, phase));
  }

  getClue(id: string): ClueEntry | undefined {
    return this.clues.get(id);
  }

  private isPhaseVisible(imported: GamePhase, current: GamePhase): boolean {
    const order: GamePhase[] = ['prologue', 'investigation', 'trial', 'verdict'];
    return order.indexOf(imported) <= order.indexOf(current);
  }
}
