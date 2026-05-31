import type { AgentMessage } from '@earendil-works/pi-agent-core';
import type { Message } from '@earendil-works/pi-ai';
import { gameMessageToUserText } from '@ace-attorney/context-engine';

export function gameConvertToLlm(messages: AgentMessage[]): Message[] {
  try {
    const result: Message[] = [];
    for (const m of messages) {
      if (m.role === 'user' || m.role === 'assistant' || m.role === 'toolResult') {
        result.push(m as Message);
        continue;
      }
      const text = gameMessageToUserText(m);
      if (text) {
        result.push({
          role: 'user',
          content: text,
          timestamp: Date.now(),
        });
      }
    }
    return result;
  } catch {
    return messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant' || m.role === 'toolResult',
    ) as Message[];
  }
}
