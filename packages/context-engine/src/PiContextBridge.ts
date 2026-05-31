import type { Agent, AgentMessage } from '@earendil-works/pi-agent-core';
import type { GamePhase } from '@ace-attorney/shared';
import type { GameContextStore } from './GameContextStore.js';

const PHASE_ORDER: GamePhase[] = ['prologue', 'investigation', 'trial', 'verdict'];

function phaseIndex(p: GamePhase): number {
  return PHASE_ORDER.indexOf(p);
}

function isPhaseVisible(imported: GamePhase, current: GamePhase): boolean {
  return phaseIndex(imported) <= phaseIndex(current);
}

export function gameMessageToUserText(msg: AgentMessage): string | null {
  if (msg.role === 'gameEvidence') {
    return `<evidence id="${msg.evidenceId}" phase="${msg.phase}">\n${msg.name}: ${msg.description}\n</evidence>`;
  }
  if (msg.role === 'gameClue') {
    return `<clue id="${msg.clueId}">\n${msg.title}: ${msg.description}\n</clue>`;
  }
  if (msg.role === 'gameDialogue') {
    return `<dialogue segment="${msg.segmentId}" speaker="${msg.speaker}" phase="${msg.phase}">\n${msg.text}\n</dialogue>`;
  }
  return null;
}

export class PiContextBridge {
  buildTransformContext(store: GameContextStore, _phase?: GamePhase) {
    return async (messages: AgentMessage[]): Promise<AgentMessage[]> => {
      const phase = store.currentPhase;
      try {
        const filtered = messages.filter((m) => {
          if (m.role === 'gameEvidence' && 'phase' in m) {
            return isPhaseVisible(m.phase as GamePhase, phase);
          }
          if (m.role === 'gameDialogue' && 'phase' in m) {
            return isPhaseVisible(m.phase as GamePhase, phase);
          }
          return true;
        });
        return filtered;
      } catch {
        return messages;
      }
    };
  }

  syncStoreToMessages(store: GameContextStore): AgentMessage[] {
    const msgs: AgentMessage[] = [];
    for (const item of store.listEvidence()) {
      const meta = store.getEvidenceMeta(item.id);
      msgs.push({
        role: 'gameEvidence',
        evidenceId: item.id,
        name: item.name,
        description: item.description,
        phase: meta?.phase ?? store.currentPhase,
      });
    }
    for (const clue of store.listClues()) {
      msgs.push({
        role: 'gameClue',
        clueId: clue.id,
        title: clue.title,
        description: clue.description,
      });
    }
    for (const seg of store.getActiveDialogue()) {
      msgs.push({
        role: 'gameDialogue',
        segmentId: seg.id,
        speaker: seg.speaker,
        text: seg.text,
        phase: seg.phase,
      });
    }
    return msgs;
  }

  applyToAgent(agent: Agent, store: GameContextStore): void {
    const contextMessages = this.syncStoreToMessages(store);
    const existing = agent.state.messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant' || m.role === 'toolResult',
    );
    agent.state.messages = [...contextMessages, ...existing];
  }

  pruneDialogueAfterSegment(agent: Agent, keepSegmentIds: Set<string>): void {
    agent.state.messages = agent.state.messages.filter((m) => {
      if (m.role !== 'gameDialogue') return true;
      return keepSegmentIds.has(m.segmentId);
    });
  }
}
