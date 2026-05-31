import { Type } from '@earendil-works/pi-ai';
import type { DialogueSpeechSegment, SegmentedDialogueJson } from '@ace-attorney/shared';
import { segmentsToPlainText } from '@ace-attorney/shared';

/** TypeBox schema — 与 SegmentedDialogueJson 对齐 */
export const SegmentedDialogueSchema = Type.Object({
  segments: Type.Array(
    Type.Object({
      text: Type.String({ minLength: 1 }),
      pauseMs: Type.Optional(Type.Number({ minimum: 0 })),
    }),
    { minItems: 1 },
  ),
});

export const SEGMENTED_DIALOGUE_PROMPT = `
## 输出格式（必须遵守）
你的所有台词必须使用分段对话，模拟真人正常说话的节奏（短句、停顿、语气转折分成多段）。
不要输出 markdown、解释或前后缀文字。
只输出一个 JSON 对象，严格符合以下结构：
{"segments":[{"text":"第一段短句。"},{"text":"第二段，可以有语气词呢！"}]}

规则：
- segments 至少 1 段；每段 text 宜短（通常 1–3 句口语）
- 用多个 segment 表现思考、停顿、惊讶、转折
- 禁止使用 \`\`\`json 代码块包裹
- 若本轮还需调用 tool，在输出 JSON 后再调用 tool（JSON 仍须完整有效）
`.trim();

export function appendSegmentedDialoguePrompt(systemPrompt: string): string {
  return `${systemPrompt}\n\n${SEGMENTED_DIALOGUE_PROMPT}`;
}

function isSpeechSegment(v: unknown): v is DialogueSpeechSegment {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.text !== 'string' || !o.text.trim()) return false;
  if (o.pauseMs !== undefined && (typeof o.pauseMs !== 'number' || o.pauseMs < 0)) return false;
  return true;
}

export function validateSegmentedDialogue(data: unknown): data is SegmentedDialogueJson {
  if (!data || typeof data !== 'object') return false;
  const segments = (data as SegmentedDialogueJson).segments;
  if (!Array.isArray(segments) || segments.length === 0) return false;
  return segments.every(isSpeechSegment);
}

export function extractJsonObject(raw: string): unknown | null {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function fallbackSegments(raw: string): DialogueSpeechSegment[] {
  const text = raw.trim();
  if (!text) return [{ text: '……' }];
  const parts = text.split(/(?<=[。！？…])\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.map((t) => ({ text: t }));
  return [{ text }];
}

/**
 * 解析 LLM 原始输出为分段台词；校验失败时按句号拆分 fallback。
 */
export function parseSegmentedDialogue(raw: string): SegmentedDialogueJson {
  const parsed = extractJsonObject(raw);
  if (parsed && validateSegmentedDialogue(parsed)) {
    return {
      segments: parsed.segments.map((s) => ({
        text: s.text.trim(),
        ...(s.pauseMs !== undefined ? { pauseMs: s.pauseMs } : {}),
      })),
    };
  }
  return { segments: fallbackSegments(raw) };
}

export function parseSegmentedField(raw: string): SegmentedDialogueJson {
  const parsed = extractJsonObject(raw);
  if (parsed && validateSegmentedDialogue(parsed)) return parsed;
  return { segments: fallbackSegments(raw) };
}

export function dialogueToReply(dialogue: SegmentedDialogueJson): string {
  return segmentsToPlainText(dialogue.segments);
}

export interface AgentDialogueResult {
  dialogue: SegmentedDialogueJson;
  reply: string;
  raw: string;
}

export function rawTextToDialogue(raw: string): AgentDialogueResult {
  const dialogue = parseSegmentedDialogue(raw);
  return { dialogue, reply: dialogueToReply(dialogue), raw };
}
