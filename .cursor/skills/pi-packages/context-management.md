# Context Management (Critical)

Read this before integrating pi in another repository. Most integration bugs are **wrong message storage**, **bypassing `convertToLlm`**, or **mixing system prompt with transcript**.

## Three Layers

| Layer | Type | Owned by | Sent to LLM? |
|-------|------|----------|--------------|
| System prompt | `string` | `agent.state.systemPrompt` / `Context.systemPrompt` | Yes, separate field |
| Transcript | `AgentMessage[]` | `agent.state.messages` | After transforms |
| Session file | JSONL tree entries | `SessionManager` (coding-agent) | Rebuilt into transcript via `buildSessionContext()` |

**pi-ai `Context`** (low-level only):

```typescript
interface Context {
  systemPrompt?: string;
  messages: Message[];  // user | assistant | toolResult only
  tools?: Tool[];
}
```

**pi-agent `AgentContext`** (agent loop):

```typescript
interface AgentContext {
  systemPrompt: string;
  messages: AgentMessage[];  // superset: custom roles + LLM roles
  tools?: AgentTool[];
}
```

Do not put system instructions in `messages` unless you intentionally want them in the transcript. Pi keeps **system prompt and messages separate** through the whole stack.

## Per-LLM-Call Pipeline

Every assistant turn runs this sequence (see `agent-loop.ts` → `streamAssistantResponse`):

```
agent.state.messages (AgentMessage[])
        │
        ▼
  transformContext?     ← prune / inject (AgentMessage level)
        │
        ▼
  convertToLlm          ← filter + map to pi-ai Message[]
        │
        ▼
  Context { systemPrompt, messages, tools }
        │
        ▼
  streamFn / streamSimple(model, context, options)
        │
        ▼
  provider transformMessages (inside pi-ai, per model)
```

Rules:

1. **`transformContext` runs on `AgentMessage[]`**, not on `Message[]`. Use it for pruning, injecting retrieved docs, stripping UI-only entries.
2. **`convertToLlm` runs after transformContext**. It must return only `user`, `assistant`, `toolResult` messages the provider accepts.
3. **`convertToLlm` and `transformContext` must not throw**. Throwing breaks the low-level loop without a normal event sequence. Return a safe fallback (e.g. original messages).
4. **Provider adapters** apply `transformMessages()` inside pi-ai (cross-model thinking, tool ID normalization, non-vision image placeholders). You do not call this yourself when using `stream`/`complete`/`streamSimple`.

### Coding-agent wiring

`createAgentSession()` sets:

- `convertToLlm`: `convertToLlm` from `packages/coding-agent/src/core/messages.ts`, optionally wrapping images when `blockImages` is enabled.
- `transformContext`: extension `context` handlers via `ExtensionRunner.emitContext()` (sequential, each sees previous output).

Extensions hook **per turn**, not once per session file load.

## AgentMessage Types

### LLM-native (pass through `convertToLlm`)

| role | Notes |
|------|-------|
| `user` | string or `(TextContent \| ImageContent)[]` |
| `assistant` | content: text, thinking, toolCall blocks |
| `toolResult` | Must follow assistant toolCall; include `toolCallId`, `toolName` |

### Coding-agent custom (mapped by built-in `convertToLlm`)

| role | LLM mapping |
|------|-------------|
| `bashExecution` | → `user` text (unless `excludeFromContext: true` for `!!` commands) |
| `custom` | → `user` with string or content blocks |
| `branchSummary` | → `user` with `<summary>` wrapper |
| `compactionSummary` | → `user` with compaction wrapper |

### Custom app types

Extend via declaration merging on `@earendil-works/pi-agent-core`:

```typescript
declare module "@earendil-works/pi-agent-core" {
  interface CustomAgentMessages {
    myStatus: { role: "myStatus"; text: string; timestamp: number };
  }
}
```

You **must** handle new roles in your `convertToLlm` (filter out or map to `user`). Default `Agent` filter only keeps `user`, `assistant`, `toolResult`:

```typescript
// packages/agent/src/agent.ts defaultConvertToLlm
messages.filter(m => m.role === "user" || m.role === "assistant" || m.role === "toolResult")
```

Unknown roles passed to default `convertToLlm` are **dropped silently** in coding-agent's switch `default` branch.

## Compaction vs transformContext

| | Compaction | transformContext |
|---|------------|------------------|
| Purpose | Summarize old transcript; free context window | Per-request view of messages |
| Persists? | Yes — `CompactionEntry` in JSONL | No — ephemeral each LLM call |
| Produces | `compactionSummary` AgentMessage | Same message list shape |
| Who runs it | `AgentSession` / `compact()` | Agent config / extensions |

After compaction, `buildSessionContext()` yields:

1. One `compactionSummary` message (synthetic user-facing summary)
2. Messages from `firstKeptEntryId` onward on the active branch

Full history remains in the JSONL file; only the **active branch view** changes.

**Do not** manually delete old messages from JSONL to "save tokens" while using pi sessions — use compaction APIs or `session.compact()`.

### Overflow recovery (coding-agent)

On context overflow from the **same** model:

1. Remove the error assistant message from `agent.state.messages` (still in session file for history)
2. Run auto-compaction once
3. Retry the prompt

Only one overflow recovery attempt per overflow episode. Switching to a larger model skips overflow compaction for stale errors.

## Session Tree and `buildSessionContext`

Sessions are JSONL **trees** (`id`, `parentId`). `SessionManager.buildSessionContext(leafId?)` walks from leaf to root and builds `AgentMessage[]`:

- Applies latest `compaction` on the path: summary first, then kept tail
- Includes `branch_summary` / `custom_message` entries on the path
- `leafId === null` → empty messages (navigated before first entry)

After compaction, tree navigation, or resume:

```typescript
const { messages } = sessionManager.buildSessionContext();
agent.state.messages = messages;  // coding-agent does this internally
```

**Anti-pattern:** Editing `agent.state.messages` without updating session entries — UI and disk diverge. **Anti-pattern:** Building your own transcript from session file without `buildSessionContext()` — compaction and branch summaries will be wrong.

### Persistence timing (coding-agent)

On `message_end`:

- `user` / `assistant` / `toolResult` → `sessionManager.appendMessage()`
- `custom` → `appendCustomMessageEntry()`
- `bashExecution`, `compactionSummary`, `branchSummary` → persisted by dedicated APIs, not generic `appendMessage`

Agent state is updated **during** the loop; session file is appended on `message_end`. When mutating a message in place (e.g. retry), mutate the **same object** reference so agent state and pending persistence stay aligned.

## System Prompt (coding-agent)

Built once per tool/skill/context change via `buildSystemPrompt()`:

- Base prompt + tool list + AGENTS.md + skills + date/cwd
- `ResourceLoader` can override via `SYSTEM.md` / `APPEND_SYSTEM.md`
- Per prompt: `before_agent_start` can inject messages and replace `systemPrompt` for **that run only**

```typescript
// After prompt, AgentSession resets to _baseSystemPrompt unless extension changed it for the turn
agent.state.systemPrompt = _baseSystemPrompt;
```

**Anti-pattern:** Appending AGENTS.md into `messages` manually when using `createAgentSession` — duplicates context (loader already merges AGENTS.md into system prompt).

## Tool Call Integrity

- Every `toolResult` must reference a real `toolCallId` from the preceding assistant message.
- Never cut compaction at `toolResult` entries (pi cut-point rules).
- After tool batch, assistant may continue; transcript order must be: `assistant` (toolCalls) → `toolResult`(s) → next `assistant` or `user`.
- `agentLoopContinue()` requires last message ∈ `{ user, toolResult }` **in AgentMessage form**; after `convertToLlm`, last message must be `user` or `toolResult` or providers reject the request.

## pi-ai-Only Integrations

If you use `stream`/`complete` without agent-core:

- You own the full loop: push assistant message, execute tools, push tool results, call again.
- Use one `Context` object; mutate `context.messages` in order.
- Call `validateToolCall` before executing tools.
- Serialize `Context` with JSON for persistence — images are base64 in JSON.
- Cross-provider handoff: pi-ai rewrites foreign thinking blocks automatically when messages move to another model.

## SDK Checklist

```typescript
// Correct: let pi own transcript + conversion
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
});
await session.prompt("Hello");
// session.agent.state.messages is authoritative during run
// session.messages is alias to agent.state.messages

// Correct: custom agent without coding-agent sessions
const agent = new Agent({
  initialState: { systemPrompt: "...", model, tools: [] },
  convertToLlm: (msgs) => msgs.filter(/* your rules */),
  transformContext: async (msgs) => prune(msgs),
});

// Wrong: pass raw UI events as assistant messages
// Wrong: store system prompt as first user message
// Wrong: skip toolResult after toolUse stopReason
// Wrong: replace agent.state.messages from scratch while streaming
// Wrong: implement convertToLlm that throws on unknown roles
```

## Extension `context` Event

Handlers run in registration order; each receives the output of the previous:

```typescript
pi.on("context", async (event, ctx) => {
  return { messages: event.messages.filter(/* ... */) };
});
```

Return `{ messages: newArray }` to replace the list for that LLM call only. Does not write to session file.

## References in pi-mono

- `packages/agent/src/agent-loop.ts` — pipeline
- `packages/coding-agent/src/core/messages.ts` — `convertToLlm`
- `packages/coding-agent/src/core/session-manager.ts` — `buildSessionContext`
- `packages/coding-agent/src/core/compaction/compaction.ts` — cut points
- `packages/ai/src/providers/transform-messages.ts` — provider boundary
- `packages/coding-agent/docs/compaction.md`, `docs/session-format.md`
