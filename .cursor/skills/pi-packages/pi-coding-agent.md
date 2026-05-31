# @earendil-works/pi-coding-agent

Coding agent CLI (`pi`) and embeddable SDK: tools, JSONL sessions, extensions, skills, compaction.

```bash
npm install @earendil-works/pi-coding-agent
npm install -g --ignore-scripts @earendil-works/pi-coding-agent  # CLI
```

Config: `~/.pi/agent` (`PI_CODING_AGENT_DIR`). Sessions: `~/.pi/agent/sessions/`.

See [context-management.md](context-management.md) for transcript/session rules.

## Modes

| Mode | Entry |
|------|-------|
| Interactive | `pi` |
| Print | `pi -p "..."` (stdin merged) |
| JSON | `pi --mode json` |
| RPC | `pi --mode rpc` — LF-delimited JSONL only; no Node `readline` on payloads |
| SDK | `createAgentSession()` |

## SDK

```typescript
import {
  AuthStorage,
  ModelRegistry,
  SessionManager,
  createAgentSession,
} from "@earendil-works/pi-coding-agent";
import { getModel } from "@earendil-works/pi-ai";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

const { session, modelFallbackMessage } = await createAgentSession({
  authStorage,
  modelRegistry,
  model: getModel("anthropic", "claude-sonnet-4-20250514"),
  thinkingLevel: "medium",
  tools: ["read", "bash", "edit", "write"],
  sessionManager: SessionManager.inMemory(),
  cwd: process.cwd(),
});
```

### createAgentSession wiring (important)

On create, pi:

1. Loads resources (`DefaultResourceLoader`: AGENTS.md, skills, extensions, SYSTEM.md)
2. Builds `_baseSystemPrompt` via `buildSystemPrompt()` (tools, skills, context files, date, cwd)
3. Creates `Agent` with `convertToLlm` (+ optional `blockImages`), `transformContext` → extension `context` handlers, `streamFn` → auth + retries + `streamSimple`
4. If session file has messages: `agent.state.messages = sessionManager.buildSessionContext().messages`
5. Wraps in `AgentSession` for persistence, compaction, extensions, prompts

### AgentSession API

```typescript
await session.prompt(text, options?: PromptOptions);
await session.steer(text);
await session.followUp(text);
session.subscribe(listener) → unsubscribe;
await session.abort();
session.dispose();

session.setModel(model);
session.setThinkingLevel(level);
session.setActiveToolsByName(["read", "grep"]);
await session.compact(customInstructions?);
await session.navigateTree(targetId, options?);

session.agent;           // pi-agent-core Agent
session.messages;        // alias agent.state.messages
session.systemPrompt;    // effective for next turn
session.isStreaming;
session.sessionId;
session.sessionFile;
```

### PromptOptions

```typescript
{
  expandPromptTemplates?: boolean,
  images?: ImageContent[],
  streamingBehavior?: "steer" | "followUp",  // required if already streaming
  preflightResult?: (accepted: boolean) => void,
}
```

Flow for normal prompts:

1. Expand `/template` and `/skill:name` (not extension commands)
2. `before_agent_start` — inject custom messages, optional systemPrompt override **for this run**
3. `_runAgentPrompt` → agent loop
4. On `message_end`: persist to JSONL (see below)
5. On `agent_end`: auto-compaction check, retry logic

Extension `/commands` run immediately (even while streaming); they use `pi.sendMessage()` and bypass queue.

### Session persistence

JSONL tree: `id`, `parentId`. See `docs/session-format.md`.

| message role | Persisted via |
|--------------|----------------|
| user, assistant, toolResult | `appendMessage` on `message_end` |
| custom | `appendCustomMessageEntry` |
| bashExecution | bash-specific append |
| compactionSummary, branchSummary | compaction / tree APIs |

**Reload transcript:**

```typescript
const ctx = sessionManager.buildSessionContext(leafId);
agent.state.messages = ctx.messages;
```

Called internally after compaction, tree navigation, resume. Do not reconstruct from arbitrary entry subsets.

### Compaction

| Trigger | Behavior |
|---------|----------|
| Threshold | `contextTokens > contextWindow - reserveTokens` → compact, user continues manually |
| Overflow | Same-model overflow error → strip error assistant from **agent state**, compact once, auto-retry |
| Manual | `session.compact()` or `/compact` |

Produces `compactionSummary` in transcript + `CompactionEntry` in file. `keepRecentTokens` / `reserveTokens` in settings.

Extension hooks: `session_before_compact`, `session_compact`. `context` extension runs **per LLM turn**, not at compact time.

```typescript
import { compact, shouldCompact, prepareCompaction, DEFAULT_COMPACTION_SETTINGS } from "@earendil-works/pi-coding-agent";
```

### AgentSessionRuntime

For `newSession`, `switchSession`, `fork`, `importFromJsonl`:

```typescript
import {
  createAgentSessionRuntime,
  createAgentSessionServices,
  createAgentSessionFromServices,
  getAgentDir,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

// Factory recreates cwd-bound services per session target
const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd()),
});

let session = runtime.session;
await runtime.newSession();
// Re-subscribe; re-bind extensions: session.bindExtensions(...)
session = runtime.session;
```

### Full control (no discovery)

```typescript
const resourceLoader: ResourceLoader = {
  getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
  getSkills: () => ({ skills: [], diagnostics: [] }),
  getPrompts: () => ({ prompts: [], diagnostics: [] }),
  getThemes: () => ({ themes: [], diagnostics: [] }),
  getAgentsFiles: () => ({ agentsFiles: [] }),
  getSystemPrompt: () => "You are minimal.",
  getAppendSystemPrompt: () => [],
  extendResources: () => {},
  reload: async () => {},
};

await createAgentSession({
  resourceLoader,
  tools: ["read", "bash"],
  settingsManager: SettingsManager.inMemory({ compaction: { enabled: false } }),
  sessionManager: SessionManager.inMemory(cwd),
});
```

Examples: `packages/coding-agent/examples/sdk/01-minimal.ts` … `13-session-runtime.ts`.

### Tools

Built-in: `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`.

```typescript
import {
  createCodingTools,
  createReadOnlyTools,
  createReadTool,
  createBashTool,
} from "@earendil-works/pi-coding-agent";
```

`cwd` in `createAgentSession({ cwd })` applies to built-in tool paths. Match `SessionManager.inMemory(cwd)` or `SessionManager.create(cwd)`.

### Extensions

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerTool({ name, description, parameters, execute });
  pi.registerCommand("cmd", { description, handler });
  pi.on("context", async (event, ctx) => ({ messages: event.messages }));
  pi.on("before_agent_start", async (event, ctx) => ({
    messages: [{ customType: "...", content: "...", display: true }],
    systemPrompt: event.systemPrompt + "\nExtra",
  }));
  pi.on("tool_call", async (event, ctx) => ({ block: true, reason: "..." }));
  pi.on("session_before_compact", async (event, ctx) => ({ cancel: true }));
}
```

Default export may be `async` — awaited before startup continues.

Types: `@earendil-works/pi-coding-agent/hooks`.

### convertToLlm (reuse)

```typescript
import { convertToLlm } from "@earendil-works/pi-coding-agent";
// Same mapping as internal agent — use in custom summarization / external LLM calls
```

Maps `bashExecution`, `custom`, `branchSummary`, `compactionSummary` → `user` text; filters `excludeFromContext` bash.

### Re-exports

`Agent`, `AgentMessage` types via agent; `getModel` via pi-ai; compaction, `SessionManager`, `buildSessionContext`, skills loaders, `runPrintMode`, `RpcClient`, TUI components for extension UI.

### Environment

| Variable | Purpose |
|----------|---------|
| `PI_CODING_AGENT_DIR` | Config root |
| `PI_CODING_AGENT_SESSION_DIR` | Session dir override |
| `PI_OFFLINE` | No network at startup |
| Provider keys | Same as pi-ai |

### Anti-patterns (coding-agent)

- Duplicating AGENTS.md into `messages` when using default loader
- Editing JSONL by hand without updating tree `parentId`
- Calling `compact()` without syncing `agent.state.messages` afterward (session does this for you)
- Extension `context` handler that persists to disk (use session APIs on `message_end` instead)
- `prompt()` during stream without `streamingBehavior`
