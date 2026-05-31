import { Agent } from '@earendil-works/pi-agent-core';
import { getEnvApiKey } from '@earendil-works/pi-ai';
import type { CharacterRole } from '@ace-attorney/shared';
import type { GameContextStore } from '@ace-attorney/context-engine';
import { buildSystemPrompt } from '../characters/buildSystemPrompt.js';
import { gameConvertToLlm } from './convertToLlm.js';
import { getModelFromEnv } from './getModelFromEnv.js';
import { rawTextToDialogue, type AgentDialogueResult } from './segmentedDialogue.js';

export class AgentFactory {
  create(role: CharacterRole, store: GameContextStore): Agent {
    const model = getModelFromEnv();
    const agent = new Agent({
      initialState: {
        systemPrompt: buildSystemPrompt(role, store, store.playerRole),
        model,
        thinkingLevel: 'off',
        tools: [],
        messages: [],
      },
      convertToLlm: gameConvertToLlm,
      transformContext: store.bridge.buildTransformContext(store, store.currentPhase),
      getApiKey: async (provider) => getEnvApiKey(provider) ?? undefined,
    });
    store.bridge.applyToAgent(agent, store);
    return agent;
  }

  refreshSystemPrompt(agent: Agent, role: CharacterRole, store: GameContextStore): void {
    agent.state.systemPrompt = buildSystemPrompt(role, store, store.playerRole);
    store.bridge.applyToAgent(agent, store);
  }
}

export const agentFactory = new AgentFactory();

async function collectAgentRawText(agent: Agent, userMessage: string): Promise<string> {
  let reply = '';
  const unsub = agent.subscribe((event) => {
    if (event.type === 'message_end' && event.message.role === 'assistant') {
      for (const block of event.message.content) {
        if (block.type === 'text') reply += block.text;
      }
    }
  });
  try {
    await agent.prompt(userMessage);
    await agent.waitForIdle();
  } finally {
    unsub();
  }
  return reply.trim();
}

export async function collectAgentDialogue(
  agent: Agent,
  userMessage: string,
): Promise<AgentDialogueResult> {
  const raw = await collectAgentRawText(agent, userMessage);
  if (!raw) {
    return { dialogue: { segments: [{ text: '……' }] }, reply: '……', raw: '' };
  }
  return rawTextToDialogue(raw);
}

export async function collectAgentReply(agent: Agent, userMessage: string): Promise<string> {
  const result = await collectAgentDialogue(agent, userMessage);
  return result.reply || '……';
}
