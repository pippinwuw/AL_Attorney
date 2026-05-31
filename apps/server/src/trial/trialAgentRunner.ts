import { Agent, type AgentTool } from '@earendil-works/pi-agent-core';
import { getEnvApiKey } from '@earendil-works/pi-ai';
import type { CharacterRole } from '@ace-attorney/shared';
import type { GameContextStore } from '@ace-attorney/context-engine';
import { gameConvertToLlm } from '../llm/convertToLlm.js';
import { getModelFromEnv } from '../llm/getModelFromEnv.js';
import { rawTextToDialogue, type AgentDialogueResult } from '../llm/segmentedDialogue.js';
import { judgeTools } from '../trial/judgeTools.js';

export function createRoleAgent(
  role: CharacterRole,
  store: GameContextStore,
  tools: AgentTool[] = [],
): Agent {
  return new Agent({
    initialState: {
      systemPrompt: '',
      model: getModelFromEnv(),
      thinkingLevel: 'off',
      tools,
      messages: [],
    },
    convertToLlm: gameConvertToLlm,
    transformContext: store.bridge.buildTransformContext(store, store.currentPhase),
    getApiKey: async (provider) => getEnvApiKey(provider) ?? undefined,
  });
}

export function makeJudgeAgentTools(onCapture: (name: string, args: Record<string, unknown>) => void): AgentTool[] {
  return judgeTools.map((tool) => ({
    ...tool,
    execute: async (_id, params) => {
      onCapture(tool.name, params as Record<string, unknown>);
      return {
        content: [{ type: 'text', text: '已记录裁定。' }],
        details: params,
      };
    },
  })) as AgentTool[];
}

export async function runAgentTurn(
  agent: Agent,
  systemPrompt: string,
  userMessage: string,
): Promise<{
  text: string;
  dialogue: AgentDialogueResult['dialogue'];
  segments: AgentDialogueResult['dialogue']['segments'];
  toolCalls: { name: string; args: Record<string, unknown> }[];
}> {
  agent.state.systemPrompt = systemPrompt;
  agent.state.messages = agent.state.messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant' || m.role === 'toolResult',
  );

  const toolCalls: { name: string; args: Record<string, unknown> }[] = [];
  let text = '';

  const unsub = agent.subscribe((event) => {
    if (event.type === 'message_end' && event.message.role === 'assistant') {
      for (const block of event.message.content) {
        if (block.type === 'text') text += block.text;
        if (block.type === 'toolCall') {
          toolCalls.push({ name: block.name, args: (block.arguments ?? {}) as Record<string, unknown> });
        }
      }
    }
  });

  try {
    await agent.prompt(userMessage);
    await agent.waitForIdle();
  } finally {
    unsub();
  }

  const parsed = rawTextToDialogue(text.trim());
  return {
    text: parsed.reply,
    dialogue: parsed.dialogue,
    segments: parsed.dialogue.segments,
    toolCalls,
  };
}
