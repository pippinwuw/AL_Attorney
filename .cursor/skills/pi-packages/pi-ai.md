# @earendil-works/pi-ai

Unified LLM API: model registry, streaming, tool calling, thinking, images, OAuth, cross-provider context handoff.

```bash
npm install @earendil-works/pi-ai
```

CLI: `npx @earendil-works/pi-ai login [provider]` saves OAuth to `./auth.json`.

## Core API

| Function | Purpose |
|----------|---------|
| `getProviders()` | List provider IDs |
| `getModels(provider)` | List models for provider |
| `getModel(provider, id)` | Typed model lookup |
| `getImageProviders()` / `getImageModels()` / `getImageModel()` | Image generation models |
| `stream(model, context, options?)` | Async iterable of stream events; call `.result()` for final message |
| `complete(model, context, options?)` | Await full assistant message |
| `streamSimple` / `completeSimple` | Unified `reasoning: 'minimal'|'low'|'medium'|'high'|'xhigh'` |
| `generateImages(model, input, options?)` | One-shot image generation (not stream/complete) |
| `validateToolCall(tools, toolCall)` | Validate args against TypeBox schema; throws on invalid |
| `getEnvApiKey(provider)` | Read env key if set |

Re-exports: `Type`, `Static`, `TSchema`, `StringEnum` from TypeBox.

## Context and Messages

```typescript
interface Context {
  systemPrompt?: string;
  messages: Message[];
  tools?: Tool[];
}

type Message = UserMessage | AssistantMessage | ToolResultMessage;
```

**Ordering:** Maintain strict alternation: user → assistant → toolResult(s) → assistant → … Incomplete tool results after `stopReason: "toolUse"` cause provider errors.

**Timestamps:** Include `timestamp: number` (Unix ms) on messages when building transcripts manually.

**System vs messages:** Put instructions in `systemPrompt`, not as fake `user` messages, unless you deliberately want them in history.

Inside pi-ai, `transformMessages()` runs per provider call (cross-model thinking → text, tool ID normalization, vision downgrade). You do not invoke it when using `stream`/`complete`/`streamSimple`.

**User content blocks:** `{ type: "text", text }`, `{ type: "image", data: base64, mimeType }`.

**Assistant content blocks:** `text`, `thinking`, `toolCall`.

**Tool result:**

```typescript
{
  role: "toolResult",
  toolCallId: string,
  toolName: string,
  content: Array<TextContent | ImageContent>,
  isError: boolean,
  timestamp: number,
}
```

`Context` is JSON-serializable — persist with `JSON.stringify` / `parse`.

## Tools

```typescript
const tool: Tool = {
  name: "read_file",
  description: "Read a file",
  parameters: Type.Object({
    path: Type.String({ description: "Absolute or relative path" }),
  }),
};
```

- Prefer `StringEnum(['a','b'])` over `Type.Enum` for Google.
- In custom loops, validate at `toolcall_end` with `validateToolCall`.
- Partial args during `toolcall_delta` may be incomplete — guard field access.

## Stream Events

| Event | Notes |
|-------|-------|
| `start` | `partial` assistant message skeleton |
| `text_start` / `text_delta` / `text_end` | Text block; use `contentIndex` |
| `thinking_start` / `thinking_delta` / `thinking_end` | Reasoning blocks |
| `toolcall_start` / `toolcall_delta` / `toolcall_end` | Tool calls; delta has partial JSON |
| `done` | `reason`: `stop` \| `length` \| `toolUse`; `message` final |
| `error` | `reason`: `error` \| `aborted`; `error` is partial AssistantMessage |

**Stop reasons on AssistantMessage:** `stop`, `length`, `toolUse`, `error`, `aborted`.

Events for different content blocks may interleave — always key off `contentIndex`.

## Stream Options (common)

```typescript
{
  apiKey?: string,
  signal?: AbortSignal,
  sessionId?: string,           // prompt caching (provider-specific)
  cacheRetention?: "none" | "short" | "long",
  headers?: Record<string, string>,
  onPayload?: (payload) => void,
  onResponse?: (response) => void,
  // Provider-specific: thinkingEnabled, reasoningEffort, thinking, etc.
}
```

## Thinking / Reasoning

**Simple API:**

```typescript
await completeSimple(model, context, { reasoning: "medium" });
```

**Provider-specific via `complete`/`stream`:**

- OpenAI: `reasoningEffort`, `reasoningSummary`
- Anthropic: `thinkingEnabled`, `thinkingBudgetTokens`
- Google: `thinking: { enabled, budgetTokens }`

Check `model.reasoning` before enabling. Non-reasoning models ignore options silently.

## Image Input vs Image Generation

**Vision (chat):** models with `model.input.includes("image")`. Pass image blocks in user messages. Use `stream`/`complete`.

**Generation:**

```typescript
import { getImageModel, generateImages } from "@earendil-works/pi-ai";

const model = getImageModel("openrouter", "google/gemini-2.5-flash-image");
const result = await generateImages(model, {
  input: [{ type: "text", text: "optional" }, { type: "text", text: "prompt here" }],
}, { apiKey: process.env.OPENROUTER_API_KEY });

for (const block of result.output) {
  if (block.type === "image") { /* block.data base64, block.mimeType */ }
}
```

Image models do not support tools. Currently OpenRouter is the image-generation provider.

## Custom / Local Models

```typescript
const ollamaModel: Model<"openai-completions"> = {
  id: "llama-3.1-8b",
  name: "Llama 3.1 8B",
  api: "openai-completions",
  provider: "ollama",
  baseUrl: "http://localhost:11434/v1",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 32000,
  compat: {
    supportsDeveloperRole: false,
    supportsReasoningEffort: false,
  },
};
```

Set `compat` for OpenAI-compatible servers that differ from defaults. Use `thinkingLevelMap` for per-level provider mapping.

Known APIs: `anthropic-messages`, `google-generative-ai`, `google-vertex`, `mistral-conversations`, `openai-completions`, `openai-responses`, `openai-codex-responses`, `azure-openai-responses`, `bedrock-converse-stream`.

## Cross-Provider Handoff

Switch `getModel()` mid-conversation on the same `Context`. Foreign assistant thinking becomes `<thinking>` tagged text. User, tool results, tool calls, and text pass through.

## Environment Variables (Node)

| Provider | Variable(s) |
|----------|-------------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY`, `ANTHROPIC_OAUTH_TOKEN` |
| Google | `GEMINI_API_KEY` |
| Vertex | `GOOGLE_CLOUD_API_KEY` or ADC + `GOOGLE_CLOUD_PROJECT` + `GOOGLE_CLOUD_LOCATION` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_BASE_URL` or `AZURE_OPENAI_RESOURCE_NAME` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Groq | `GROQ_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN` |
| Bedrock | AWS credential chain |
| … | See full list in package README |

Browser: pass `apiKey` explicitly; no env auto-load.

## OAuth (`@earendil-works/pi-ai/oauth`)

```typescript
import { loginAnthropic, getOAuthApiKey, refreshOAuthToken } from "@earendil-works/pi-ai/oauth";

const creds = await loginAnthropic({ onAuth, onPrompt, onProgress });
const result = await getOAuthApiKey("anthropic", storedAuthMap);
// result.apiKey, result.newCredentials — persist credentials yourself
```

Providers: Anthropic (subscription), OpenAI Codex (ChatGPT Plus/Pro), GitHub Copilot, Gemini CLI.

## Faux Provider (tests)

```typescript
const reg = registerFauxProvider({ tokensPerSecond: 50 });
reg.setResponses([fauxAssistantMessage([fauxThinking("..."), fauxToolCall("echo", { text: "hi" })], { stopReason: "toolUse" })]);
const model = reg.getModel();
// queue with setResponses / appendResponses
reg.unregister();
```

## Supported Providers (high level)

OpenAI, Azure OpenAI Responses, OpenAI Codex, Anthropic, Google, Vertex, Mistral, Groq, Cerebras, Cloudflare AI Gateway/Workers AI, xAI, OpenRouter, Vercel AI Gateway, Bedrock, Fireworks, Together, Kimi, MiniMax, Xiaomi MiMo, GitHub Copilot, OpenCode Zen/Go, and any OpenAI-compatible endpoint (Ollama, vLLM, LM Studio, LiteLLM, …).

Only tool-capable chat models are in the generated registry.
