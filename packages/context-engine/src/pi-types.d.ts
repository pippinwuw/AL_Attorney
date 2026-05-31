import type { GamePhase, CharacterRole } from '@ace-attorney/shared';

declare module '@earendil-works/pi-agent-core' {
  interface CustomAgentMessages {
    gameEvidence: {
      role: 'gameEvidence';
      evidenceId: string;
      name: string;
      description: string;
      phase: GamePhase;
    };
    gameClue: {
      role: 'gameClue';
      clueId: string;
      title: string;
      description: string;
    };
    gameDialogue: {
      role: 'gameDialogue';
      segmentId: string;
      speaker: CharacterRole | 'player' | 'npc';
      text: string;
      phase: GamePhase;
    };
  }
}

export type GameAgentMessage =
  | import('@earendil-works/pi-agent-core').AgentMessage
  | import('@earendil-works/pi-agent-core').CustomAgentMessages[keyof import('@earendil-works/pi-agent-core').CustomAgentMessages];
