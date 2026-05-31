import { Type, type Tool } from '@earendil-works/pi-ai';

export const JUDGE_TOOL_NAMES = {
  testimonyValid: 'testimony_valid',
  testimonyRejected: 'testimony_rejected',
  reconstructionStage: 'reconstruction_stage',
  verdictPronounced: 'verdict_pronounced',
} as const;

export const judgeTools: Tool[] = [
  {
    name: JUDGE_TOOL_NAMES.testimonyValid,
    description: '接受辩护律师的说明，进入犯罪现场/手法复原阶段',
    parameters: Type.Object({}),
  },
  {
    name: JUDGE_TOOL_NAMES.testimonyRejected,
    description: '驳回说明（不严重时指出问题，玩家可重试）',
    parameters: Type.Object({
      feedback: Type.String({ description: '法官对辩护律师的指出与要求' }),
      severe: Type.Optional(Type.Boolean({ description: '是否严重到应宣判有罪' })),
    }),
  },
  {
    name: JUDGE_TOOL_NAMES.reconstructionStage,
    description: '评价复原进度并反馈给玩家',
    parameters: Type.Object({
      completedStepIds: Type.Array(Type.String(), { description: '本回合新完成的 checklist 条目 ID' }),
      feedback: Type.String({ description: '对玩家的进度反馈' }),
      allComplete: Type.Boolean({ description: '是否已全部完成' }),
    }),
  },
  {
    name: JUDGE_TOOL_NAMES.verdictPronounced,
    description: '宣判被告人有罪，辩护律师失败',
    parameters: Type.Object({
      reason: Type.String({ description: '判决理由' }),
    }),
  },
];

export interface ParsedToolCall {
  name: string;
  args: Record<string, unknown>;
}

export function extractToolCallsFromAgent(messages: { role: string; content?: unknown }[]): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (block && typeof block === 'object' && 'type' in block && block.type === 'toolCall') {
        const b = block as { name: string; arguments?: Record<string, unknown> };
        calls.push({ name: b.name, args: b.arguments ?? {} });
      }
    }
  }
  return calls;
}
