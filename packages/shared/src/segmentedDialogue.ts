/** LLM 分段台词中的一段（模拟真人说话节奏） */
export interface DialogueSpeechSegment {
  text: string;
  /** 该段说完后建议停顿毫秒（UI 可选采用） */
  pauseMs?: number;
}

/** LLM 必须输出的 JSON 根结构 */
export interface SegmentedDialogueJson {
  segments: DialogueSpeechSegment[];
}

/** 带说话人信息的法庭/庭审消息 */
export interface CourtSpeechMessage {
  speaker: string;
  text: string;
  portrait?: string;
  segments?: DialogueSpeechSegment[];
}

/** 将分段台词合并为单行（兼容旧 UI / 日志） */
export function segmentsToPlainText(segments: DialogueSpeechSegment[]): string {
  return segments.map((s) => s.text.trim()).filter(Boolean).join('\n');
}
