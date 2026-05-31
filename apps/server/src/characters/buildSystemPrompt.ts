import type { CharacterRole, GamePhase, PlayerRole } from '@ace-attorney/shared';
import type { GameContextStore } from '@ace-attorney/context-engine';
import type { CharacterTemplate } from './roles.js';
import { mayaTemplate } from './templates/maya.js';
import { prosecutorTemplate } from './templates/prosecutor.js';
import { judgeTemplate } from './templates/judge.js';
import { defenseAttorneyTemplate } from './templates/defenseAttorney.js';
import { suspectTemplate } from './templates/suspect.js';
import { appendSegmentedDialoguePrompt } from '../llm/segmentedDialogue.js';

const templates: Record<CharacterRole, CharacterTemplate> = {
  maya: mayaTemplate,
  prosecutor: prosecutorTemplate,
  judge: judgeTemplate,
  defenseAttorney: defenseAttorneyTemplate,
  suspect: suspectTemplate,
};

const phaseLabels: Record<GamePhase, string> = {
  prologue: '前情提要',
  investigation: '庭前调查',
  trial: '法庭审理',
  verdict: '宣判',
};

function buildContextBlock(store: GameContextStore, phase: GamePhase): string {
  const lines: string[] = ['--- 当前案件上下文 ---', `阶段：${phaseLabels[phase]}`];

  const facts = store.getKnownFacts();
  if (facts.length) {
    lines.push('已知事实：', ...facts.map((f) => `- ${f}`));
  }

  const evidence = store.listEvidence(phase);
  if (evidence.length) {
    lines.push('已收集证物：', ...evidence.map((e) => `- ${e.name}：${e.description}`));
  }

  const clues = store.listClues();
  if (clues.length && phase !== 'prologue') {
    lines.push('线索：', ...clues.map((c) => `- ${c.title}：${c.description}`));
  }

  if (phase === 'trial') {
    const dialogue = store.getActiveDialogue().slice(-6);
    if (dialogue.length) {
      lines.push('近期法庭对话：', ...dialogue.map((d) => `[${d.speakerDisplay}] ${d.text}`));
    }
  }

  lines.push('--- 上下文结束 ---');
  return lines.join('\n');
}

export function getTemplate(role: CharacterRole): CharacterTemplate {
  return templates[role];
}

export function buildSystemPrompt(
  role: CharacterRole,
  store: GameContextStore,
  playerRole?: PlayerRole,
): string {
  const t = templates[role];
  const parts = [
    t.systemPrompt,
    '',
    '约束：',
    ...t.constraints.map((c) => `- ${c}`),
    '',
    buildContextBlock(store, store.currentPhase),
  ];

  if (playerRole) {
    parts.push('', `玩家扮演：${playerRole === 'naruhodo' ? '成步堂（辩护律师）' : '真宵（助手）'}`);
  }

  return appendSegmentedDialoguePrompt(parts.join('\n'));
}

export { templates };
