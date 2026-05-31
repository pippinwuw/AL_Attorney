import type { CaseDossier, CaseDossierSection } from '@ace-attorney/shared';

export function createDefaultDossier(caseTitle: string): CaseDossier {
  const now = Date.now();
  const sections: CaseDossierSection[] = [
    { id: 'overview', heading: '案件概要', body: '（真宵尚未整理，请指导我补充。）' },
    { id: 'timeline', heading: '时间线', body: '（待补充）' },
    { id: 'evidence_summary', heading: '证物摘要', body: '（待补充）' },
    { id: 'contradictions', heading: '矛盾与疑点', body: '（待补充）' },
  ];
  return { title: `${caseTitle} — 案情卷宗`, sections, updatedAt: now };
}

export function dossierToPromptText(dossier: CaseDossier): string {
  const lines = [`# ${dossier.title}`, ...dossier.sections.map((s) => `## ${s.heading}\n${s.body}`)];
  return lines.join('\n\n');
}
