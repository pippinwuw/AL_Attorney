---
name: pi-packages
description: >-
  Integrate @earendil-works/pi-ai, pi-agent-core, pi-tui, and pi-coding-agent in
  external projects. Use when building with pi LLM APIs, agent loops, terminal
  UIs, embedding the pi coding agent SDK, context/compaction/session handling,
  or when the user mentions @earendil-works/*, pi-mono, createAgentSession,
  convertToLlm, transformContext, or Agent class.
---

# Pi Packages (@earendil-works/*)

Official npm packages from [pi-mono](https://github.com/earendil-works/pi-mono). Read this skill before writing integration code in another repository.

## Requirements

- **Node.js** `>=22.19.0`
- **ESM only** — `"type": "module"`. Use static `import`, not `require`.
- Types ship at package entry points (`dist/index.d.ts`). Do not import from `packages/...` paths in external repos.
- **pi-ai** registry includes only models that support tool/function calling.

Lockstep version (check npm): `0.75.x` across all four packages.

## Package Map

| Package | npm name | Use when |
|---------|----------|----------|
| LLM toolkit | `@earendil-works/pi-ai` | Direct provider calls, tools, streaming, images, OAuth |
| Agent framework | `@earendil-works/pi-agent-core` | Stateful agent loop, tools, events, compaction harness |
| Terminal UI | `@earendil-works/pi-tui` | Flicker-free CLI/TUI |
| Coding agent | `@earendil-works/pi-coding-agent` | CLI + SDK, sessions, extensions, built-in tools |

```
pi-coding-agent → pi-agent-core → pi-ai
                → pi-tui
```

## Choose the Right Package

| Goal | Package |
|------|---------|
| Own loop, no pi session/tools | `pi-ai` |
| Agent loop, custom tools/UI | `pi-agent-core` + `pi-ai` |
| Terminal app only | `pi-tui` |
| File/bash tools, sessions, skills, extensions | `pi-coding-agent` |

## Context Management (read first)

**[context-management.md](context-management.md)** — full rules. Summary:

1. **System prompt** (`agent.state.systemPrompt`) is separate from **transcript** (`agent.state.messages`). Do not stuff system instructions into `messages` when using pi's loaders.
2. **Every LLM call:** `transformContext?(AgentMessage[])` → `convertToLlm(AgentMessage[])` → `Message[]` → provider. Hooks must **not throw**.
3. **`AgentMessage`** includes custom roles (`bashExecution`, `custom`, `compactionSummary`, …). Default `Agent` `convertToLlm` keeps only `user` | `assistant` | `toolResult`. Coding-agent uses `convertToLlm` from `@earendil-works/pi-coding-agent` (re-exported pattern in `core/messages.ts`).
4. **Sessions (coding-agent):** JSONL tree on disk; `buildSessionContext()` rebuilds transcript including compaction summaries. After compact/navigate, sync with `agent.state.messages = buildSessionContext().messages` — do not hand-roll from raw JSONL lines.
5. **Compaction** persists summary entries; **transformContext** is ephemeral per request. Do not delete JSONL history to trim context.
6. **Tool loop:** `assistant` with `toolCall` → `toolResult`(s) → next turn. `stopReason: "toolUse"` means you must add tool results before the next `complete`/`stream` or agent continue.
7. **`agentLoopContinue`:** last `AgentMessage` must be `user` or `toolResult`, not `assistant`.

## Quick Starts

### pi-ai — tool loop

```typescript
import { Type, getModel, stream, complete, validateToolCall, type Context, type Tool } from "@earendil-works/pi-ai";

const model = getModel("openai", "gpt-4o-mini");
const tools: Tool[] = [{
  name: "get_time",
  description: "Get current time",
  parameters: Type.Object({ timezone: Type.Optional(Type.String()) }),
}];

const context: Context = {
  systemPrompt: "You are helpful.",
  messages: [{ role: "user", content: "What time is it?", timestamp: Date.now() }],
  tools,
};

const s = stream(model, context);
for await (const e of s) {
  if (e.type === "text_delta") process.stdout.write(e.delta);
}
const assistant = await s.result();
context.messages.push(assistant);

for (const block of assistant.content) {
  if (block.type !== "toolCall") continue;
  const args = validateToolCall(tools, block);
  context.messages.push({
    role: "toolResult",
    toolCallId: block.id,
    toolName: block.name,
    content: [{ type: "text", text: new Date().toLocaleString("en-US", { timeZone: (args as { timezone?: string }).timezone ?? "UTC" }) }],
    isError: false,
    timestamp: Date.now(),
  });
}
if (assistant.stopReason === "toolUse") {
  context.messages.push(await complete(model, context));
}
```

User messages should include `timestamp: number` (Unix ms) when building transcripts manually.

### pi-agent-core

```typescript
import { Agent } from "@earendil-works/pi-agent-core";
import { getModel } from "@earendil-works/pi-ai";

const agent = new Agent({
  initialState: {
    systemPrompt: "You are helpful.",
    model: getModel("anthropic", "claude-sonnet-4-20250514"),
    tools: [],
  },
  // Required if you add CustomAgentMessages beyond user/assistant/toolResult:
  // convertToLlm: (messages) => ...
});

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});
await agent.prompt("Hello");
await agent.waitForIdle();
```

### pi-coding-agent SDK

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
});
try {
  session.subscribe((e) => {
    if (e.type === "message_update" && e.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(e.assistantMessageEvent.delta);
    }
  });
  await session.prompt("List files here.");
} finally {
  session.dispose();
}
```

`session.messages` === `session.agent.state.messages`. `session.systemPrompt` is the effective prompt for the next turn (may differ from base after `before_agent_start`).

## Cross-Cutting Rules

### TypeBox tools

```typescript
import { Type, StringEnum } from "@earendil-works/pi-ai";
```

Use `StringEnum` not `Type.Enum` (Google). In custom pi-ai loops, `validateToolCall(tools, toolCall)` before execute. Agent-core validates automatically in its loop.

### Tool results (agent-core / coding-agent)

**Throw** on failure; do not return error text as success `content`:

```typescript
return { content: [{ type: "text", text: "ok" }], details: {} };
```

### Streaming

- pi-ai: use `contentIndex`; `text_*`, `thinking_*`, `toolcall_*` may interleave.
- agent: `message_update` only for assistant; includes nested `assistantMessageEvent`.

### Auth

- Env keys: see [pi-ai.md](pi-ai.md). Override with `{ apiKey }`.
- OAuth: `@earendil-works/pi-ai/oauth`; store credentials yourself.
- SDK: `AuthStorage.create()` + `ModelRegistry.create(authStorage)`.

### Tests

`registerFauxProvider()` from pi-ai for deterministic streams; `unregister()` when done.

## Subpath Exports

| Path | Contents |
|------|----------|
| `@earendil-works/pi-ai` | Core |
| `@earendil-works/pi-ai/oauth` | OAuth |
| `@earendil-works/pi-ai/anthropic`, `/google`, … | Provider-specific streams |
| `@earendil-works/pi-agent-core` | Agent, agentLoop |
| `@earendil-works/pi-agent-core/node` | + `NodeExecutionEnv` |
| `@earendil-works/pi-tui` | TUI |
| `@earendil-works/pi-coding-agent` | SDK, sessions, tools |
| `@earendil-works/pi-coding-agent/hooks` | Extension hook types |

## Detailed References

| File | Topics |
|------|--------|
| [context-management.md](context-management.md) | **Transcript, compaction, sessions, convertToLlm** |
| [pi-ai.md](pi-ai.md) | Providers, streaming, images, thinking |
| [pi-agent-core.md](pi-agent-core.md) | Agent config, events, tools, loop |
| [pi-tui.md](pi-tui.md) | Components, overlays, keys |
| [pi-coding-agent.md](pi-coding-agent.md) | SDK, sessions, extensions, RPC |

Upstream: `packages/coding-agent/docs/sdk.md`, `docs/compaction.md`, `docs/session-format.md`.

## Common Mistakes

| Mistake | Correct approach |
|---------|------------------|
| System text in first `user` message | Use `systemPrompt` / `buildSystemPrompt` / `ResourceLoader` |
| Raw JSONL → LLM without `buildSessionContext` | Use `SessionManager.buildSessionContext()` |
| Mutate `messages` only, not session entries | Persist via `SessionManager` on `message_end` paths |
| Custom `AgentMessage` roles without `convertToLlm` | Map or filter; default drops unknown roles |
| `transformContext` throws or edits `Message[]` | Operate on `AgentMessage[]`; never throw |
| Skip `toolResult` after `toolUse` | Push results, then continue |
| `session.prompt()` while streaming | `steer()` / `followUp()` or `{ streamingBehavior }` |
| `agentLoop()` async handlers as barriers | Use `Agent` class for preflight barriers |
| `complete`/`stream` for image generation | `getImageModel` + `generateImages` |
| Replace `agent.state.messages` mid-`prompt()` | Wait for idle; use session APIs for branch/compaction |
| `convertToLlm` throws | Return safe fallback; throwing breaks the loop |
| Re-subscribe after `runtime.newSession()` | Re-bind extensions; `runtime.session` changes |
