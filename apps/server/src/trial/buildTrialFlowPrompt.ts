import type { CharacterRole, ReconstructionStep, TestimonyLine } from '@ace-attorney/shared';
import type { GameContextStore } from '@ace-attorney/context-engine';
import { buildSystemPrompt } from '../characters/buildSystemPrompt.js';
import { appendSegmentedDialoguePrompt } from '../llm/segmentedDialogue.js';

export interface TrialFlowInfo {
  phase: string;
  witnessName: string;
  currentLine?: TestimonyLine;
  explanation?: string;
  evidenceName?: string;
  reconstructionSteps?: ReconstructionStep[];
  completedStepIds?: string[];
  thread?: string;
}

export function buildTrialAgentPrompt(
  role: CharacterRole,
  store: GameContextStore,
  flow: TrialFlowInfo,
): string {
  const base = buildSystemPrompt(role, store, store.playerRole);
  const flowBlock = [
    '',
    '--- 当前庭审流程 ---',
    `阶段：${flow.phase}`,
    `证人：${flow.witnessName}`,
  ];

  if (flow.currentLine) {
    flowBlock.push(`当前证词：「${flow.currentLine.text}」`);
  }
  if (flow.evidenceName) {
    flowBlock.push(`辩护方出示：${flow.evidenceName}`);
  }
  if (flow.explanation) {
    flowBlock.push(`辩护方说明：${flow.explanation}`);
  }
  if (flow.reconstructionSteps?.length) {
    flowBlock.push(
      '复原 checklist：',
      ...flow.reconstructionSteps.map(
        (s) =>
          `- [${flow.completedStepIds?.includes(s.id) ? '已完成' : '未完成'}] ${s.id}: ${s.prompt}`,
      ),
    );
  }
  if (flow.thread) {
    flowBlock.push('', '--- 本轮对话记录 ---', flow.thread);
  }
  flowBlock.push('--- 流程信息结束 ---');

  if (role === 'judge') {
    flowBlock.push(
      '',
      '你必须通过 tool 作出裁定：',
      '- 说明成立且证物已正确 → testimony_valid',
      '- 说明不成立但不严重 → testimony_rejected（给出 feedback，severe=false）',
      '- 说明荒谬或严重失败 → verdict_pronounced 或 testimony_rejected（severe=true）',
      '- 复原阶段 → reconstruction_stage（completedStepIds, feedback, allComplete）',
    );
  }

  if (role === 'prosecutor') {
    flowBlock.push('', '你仅在法官裁定后补充一句简短台词，不影响结果。');
  }

  return appendSegmentedDialoguePrompt(base + flowBlock.join('\n'));
}
