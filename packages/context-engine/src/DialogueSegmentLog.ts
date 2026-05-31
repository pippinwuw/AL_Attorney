import type { DialogueSegment } from '@ace-attorney/shared';
import type { AppendDialogueInput } from './types.js';

let segCounter = 0;

function nextSegmentId(): string {
  segCounter += 1;
  return `seg_${Date.now()}_${segCounter}`;
}

export class DialogueSegmentLog {
  private segments: DialogueSegment[] = [];
  private activeTailId: string | null = null;

  append(input: AppendDialogueInput): DialogueSegment {
    const segment: DialogueSegment = {
      id: nextSegmentId(),
      parentId: input.parentId ?? this.activeTailId,
      phase: input.phase,
      speaker: input.speaker,
      speakerDisplay: input.speakerDisplay,
      text: input.text,
      timestamp: Date.now(),
      metadata: input.metadata,
    };
    this.segments.push(segment);
    this.activeTailId = segment.id;
    return segment;
  }

  getSegment(id: string): DialogueSegment | undefined {
    return this.segments.find((s) => s.id === id);
  }

  list(fromSegmentId?: string): DialogueSegment[] {
    if (!fromSegmentId) return [...this.segments];
    const idx = this.segments.findIndex((s) => s.id === fromSegmentId);
    if (idx < 0) return [];
    return this.segments.slice(idx);
  }

  getActiveTail(): DialogueSegment[] {
    if (!this.activeTailId) return [];
    const idx = this.segments.findIndex((s) => s.id === this.activeTailId);
    if (idx < 0) return [...this.segments];
    // Walk back to root from active tail
    const chain: DialogueSegment[] = [];
    let current: DialogueSegment | undefined = this.segments[idx];
    while (current) {
      chain.unshift(current);
      if (!current.parentId) break;
      current = this.segments.find((s) => s.id === current!.parentId);
    }
    return chain;
  }

  /** Truncate dialogue after toSegmentId (inclusive keep) */
  backtrack(toSegmentId: string): DialogueSegment[] {
    const target = this.getSegment(toSegmentId);
    if (!target) {
      throw new Error(`Segment not found: ${toSegmentId}`);
    }
    const keepIds = new Set<string>();
    let current: DialogueSegment | undefined = target;
    while (current) {
      keepIds.add(current.id);
      if (!current.parentId) break;
      current = this.segments.find((s) => s.id === current!.parentId);
    }
    this.segments = this.segments.filter((s) => keepIds.has(s.id));
    this.activeTailId = toSegmentId;
    return this.getActiveTail();
  }

  getAll(): DialogueSegment[] {
    return [...this.segments];
  }

  clear(): void {
    this.segments = [];
    this.activeTailId = null;
  }
}
