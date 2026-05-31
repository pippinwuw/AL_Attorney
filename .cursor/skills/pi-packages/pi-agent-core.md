# @earendil-works/pi-agent-core

Stateful agent: prompt → LLM → tools → repeat, with events and queues. Depends on `@earendil-works/pi-ai`.

```bash
npm install @earendil-works/pi-agent-core
```

Node: `@earendil-works/pi-agent-core/node` adds `NodeExecutionEnv`.

See [context-management.md](context-management.md) for transcript rules.

## Agent Class

```typescript
import { Agent, type AgentTool, type AgentMessage } from "@earendil-works/pi-agent-core";
import { Type, getModel } from "@earendil-works/pi-ai";

const agent = new Agent({
  initialState: {
    systemPrompt: "You are helpful.",
    model: getModel("openai", "gpt-4o"),
    thinkingLevel: "off",
    tools: [],
    messages: [],
  },
  convertToLlm: (messages) =>
    messages.flatMap((m) => {
      if (m.role === "user" || m.role === "assistant" || m.role === "toolResult") return [m];
      return [];
    }),
  transformContext: async (messages, signal) => {
    // Optional: prune / inject on AgentMessage[] — must not throw
    return messages;
  },
  toolExecution: "parallel",
  sessionId: "session-1",
  getApiKey: async (provider) => process.env.OPENAI_API_KEY,
  streamFn: undefined, // default streamSimple
  beforeToolCall: async ({ toolCall, args, context }) => undefined,
  afterToolCall: async ({ toolCall, result, isError, context }) => undefined,
  shouldStopAfterTurn: async ({ context, message, toolResults, newMessages }) => false,
  prepareNextTurn: async () => undefined,
});
```

Default `convertToLlm` if omitted: filter to `user` | `assistant` | `toolResult` only.

### AgentState

| Field | Notes |
|-------|-------|
| `systemPrompt` | Sent on every LLM call; not part of `messages` |
| `messages` | Full transcript (`AgentMessage[]`). Assigning `state.messages = arr` copies top-level array |
| `model`, `thinkingLevel`, `tools` | |
| `isStreaming` | True until run + awaited `agent_end` listeners finish |
| `streamingMessage` | Partial assistant during stream |
| `pendingToolCalls` | Set of in-flight tool IDs |
| `errorMessage` | Last assistant error/aborted message text |

### Methods

```typescript
await agent.prompt("text");
await agent.prompt("text", [imageContent]);
await agent.prompt(agentMessageOrArray);
await agent.continue(); // last msg: user | toolResult

agent.steer(message); agent.followUp(message);
agent.clearSteeringQueue(); agent.clearFollowUpQueue();
agent.abort(); await agent.waitForIdle();
agent.reset();
```

`prompt()` while `isStreaming` throws — use `steer`/`followUp`.

`continue()` when last message is `assistant`: drains steering queue first, then follow-up, else throws.

### Config on instance

```typescript
agent.convertToLlm = fn;
agent.transformContext = fn;
agent.streamFn = fn;
agent.sessionId = "...";
agent.toolExecution = "sequential";
agent.steeringMode = "one-at-a-time"; // | "all"
agent.followUpMode = "one-at-a-time";
agent.thinkingBudgets = { low: 512, medium: 1024, high: 2048 };
```

## Events

Subscribe: `agent.subscribe(async (event, signal) => {})`. Listeners awaited in order; `agent_end` listeners block `waitForIdle()`.

| Event | When |
|-------|------|
| `agent_start` / `agent_end` | Run boundaries; `agent_end` has `messages` from this run |
| `turn_start` / `turn_end` | One assistant response + its tool results |
| `message_start` / `message_end` | All roles |
| `message_update` | Assistant only; `assistantMessageEvent` from pi-ai |
| `tool_execution_*` | Tool lifecycle |

`Agent` class: `message_end` on assistant is a **barrier** before tool preflight. Raw `agentLoop()` does **not** wait for your async handlers before tools run.

## Tool Execution

```typescript
const tool: AgentTool = {
  name: "read_file",
  label: "Read",
  description: "Read a file",
  parameters: Type.Object({ path: Type.String() }),
  executionMode: "sequential", // forces whole batch sequential if any call uses it
  execute: async (id, params, signal, onUpdate) => {
    onUpdate?.({ content: [{ type: "text", text: "..." }], details: {} });
    return { content: [{ type: "text", text: data }], details: { path: params.path } };
  },
};
```

- **Throw** on failure.
- `terminate: true` on result skips follow-up LLM only if **all** tools in batch set it.
- `beforeToolCall`: `{ block: true, reason }` → error tool result to model.
- `afterToolCall`: replace `content` / `details` / `isError` / `terminate` (field-wise, no deep merge).

Parallel mode: `tool_execution_end` order = completion order; toolResult **messages** appended in assistant tool-call order.

## Low-Level Loop

```typescript
import { agentLoop, agentLoopContinue, type AgentContext, type AgentLoopConfig } from "@earendil-works/pi-agent-core";

const context: AgentContext = {
  systemPrompt: "...",
  messages: [],
  tools: [myTool],
};

const config: AgentLoopConfig = {
  model,
  convertToLlm: (msgs) => ...,
  transformContext: async (msgs) => msgs,
  getSteeringMessages: async () => [],
  getFollowUpMessages: async () => [],
};

for await (const event of agentLoop([userMsg], context, config)) { /* ... */ }
for await (const event of agentLoopContinue(context, config)) { /* ... */ }
```

`agentLoop` appends prompts to `context.messages` before streaming. `agentLoopContinue` uses existing messages as-is.

## Harness Exports (sessions / compaction)

For apps implementing their own session storage (same logic as coding-agent):

- `compact`, `prepareCompaction`, `shouldCompact`, `findCutPoint`, `generateSummary`
- `buildSessionContext` (harness), `Session`, JSONL repos
- `loadSkills`, prompt template helpers
- `convertToLlm` in `harness/messages.ts` (same semantics as coding-agent)

Use these when **not** using `pi-coding-agent` but wanting pi-compatible compaction.

## Browser Proxy

```typescript
import { Agent, streamProxy } from "@earendil-works/pi-agent-core";

new Agent({
  streamFn: (model, ctx, opts) =>
    streamProxy(model, ctx, { ...opts, proxyUrl: "https://api.example.com", authToken: "..." }),
});
```

## Custom Messages

```typescript
declare module "@earendil-works/pi-agent-core" {
  interface CustomAgentMessages {
    notification: { role: "notification"; text: string; timestamp: number };
  }
}
```

Must handle in `convertToLlm` — default Agent drops them.
