import type { CaseData, EvidenceItem } from '@ace-attorney/shared';
import rawCase from '../data/case01.json';

interface RawCase extends Omit<CaseData, 'investigation'> {
  evidence: Record<string, EvidenceItem>;
  trialDialogs: Record<string, { id: string; speaker: string; text: string; portrait?: string }>;
  investigation: CaseData['investigation'];
}

const raw = rawCase as RawCase;

export const case01: CaseData & {
  evidenceMap: Record<string, EvidenceItem>;
  trialDialogs: Record<string, { id: string; speaker: string; text: string; portrait?: string }>;
} = {
  ...raw,
  evidenceMap: raw.evidence,
  trialDialogs: raw.trialDialogs,
};

export function getEvidence(id: string): EvidenceItem | undefined {
  return case01.evidenceMap[id];
}

export function getCase(caseId: string) {
  if (caseId === 'case01') return case01;
  throw new Error(`Unknown case: ${caseId}`);
}
