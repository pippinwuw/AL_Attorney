import type { CaseDossier, CaseDossierSection, DialogueSpeechSegment } from '@ace-attorney/shared';
import {
  dialogueToReply,
  extractJsonObject,
  parseSegmentedDialogue,
  validateSegmentedDialogue,
} from '../llm/segmentedDialogue.js';

export const DOSSIER_EDIT_PROMPT = `
## 输出格式（卷宗编辑模式）
你是助手真宵，正在帮成步堂维护「案情卷宗」。成步堂会通过对话指导你修改卷宗。
必须只输出一个 JSON 对象（禁止 markdown 代码块）：
{
  "segments": [{"text":"分段对话，模拟真人说话"}],
  "dossier": {
    "title": "卷宗标题",
    "sections": [
      {"id":"overview","heading":"案件概要","body":"..."},
      {"id":"timeline","heading":"时间线","body":"..."}
    ]
  }
}

规则：
- segments：你的口语回应，至少 1 段
- dossier：当成步堂要求修改、补充、整理卷宗时必须包含；未修改时可省略 dossier 字段
- 修改 dossier 时输出完整 sections（保留 id，更新 body/heading）
- section id 建议：overview, timeline, evidence_summary, contradictions
`.trim();

function isDossierSection(v: unknown): v is CaseDossierSection {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.heading === 'string' && typeof o.body === 'string';
}

export function validateCaseDossier(data: unknown): data is Omit<CaseDossier, 'updatedAt'> {
  if (!data || typeof data !== 'object') return false;
  const d = data as CaseDossier;
  if (typeof d.title !== 'string' || !d.title.trim()) return false;
  if (!Array.isArray(d.sections) || d.sections.length === 0) return false;
  return d.sections.every(isDossierSection);
}

export interface DossierChatParseResult {
  segments: DialogueSpeechSegment[];
  reply: string;
  dossier?: CaseDossier;
}

export function parseDossierChatResponse(raw: string): DossierChatParseResult {
  const parsed = extractJsonObject(raw);

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.segments) && (obj.segments as unknown[]).length > 0) {
      const segments = (obj.segments as DialogueSpeechSegment[])
        .filter((s) => s?.text?.trim())
        .map((s) => ({ text: s.text.trim(), ...(s.pauseMs !== undefined ? { pauseMs: s.pauseMs } : {}) }));
      if (segments.length) {
        let dossier: CaseDossier | undefined;
        if (obj.dossier && validateCaseDossier(obj.dossier)) {
          dossier = { ...(obj.dossier as Omit<CaseDossier, 'updatedAt'>), updatedAt: Date.now() };
        }
        return { segments, reply: segments.map((s) => s.text).join('\n'), dossier };
      }
    }
    if (validateSegmentedDialogue(obj)) {
      return { segments: obj.segments, reply: dialogueToReply(obj) };
    }
  }

  const dialogue = parseSegmentedDialogue(raw);
  return { segments: dialogue.segments, reply: dialogueToReply(dialogue) };
}
