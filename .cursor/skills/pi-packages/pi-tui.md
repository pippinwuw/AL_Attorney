# @earendil-works/pi-tui

Terminal UI with differential rendering and CSI 2026 synchronized output (flicker-free updates).

```bash
npm install @earendil-works/pi-tui
```

Standalone — no pi-ai dependency.

## Architecture

```
Terminal (ProcessTerminal | custom)
  └── TUI
        ├── children: Component[]
        ├── overlays
        └── focus: Component | Focusable
```

Each frame, TUI calls `component.render(width)` → `string[]` (one line per row). **Every line must be ≤ `width` columns** (visible width, not byte length).

## Minimal App

```typescript
import {
  TUI, Text, Editor, ProcessTerminal,
  matchesKey, truncateToWidth, visibleWidth,
} from "@earendil-works/pi-tui";

const tui = new TUI(new ProcessTerminal());

tui.addChild(new Text("Hello"));
const editor = new Editor(tui, editorTheme);
editor.onSubmit = (text) => {
  tui.addChild(new Text(truncateToWidth(`> ${text}`, tui.terminal.columns)));
};
tui.addChild(editor);
tui.setFocus(editor);

tui.addInputListener((data) => {
  if (matchesKey(data, "ctrl+c")) { tui.stop(); process.exit(0); }
});

tui.start(); // blocks until stop()
```

Raw mode: Ctrl+C does not SIGINT — handle in `addInputListener`.

## TUI API

```typescript
const tui = new TUI(terminal);

tui.addChild(component);
tui.removeChild(component);
tui.setFocus(component);
tui.requestRender();
tui.start();
tui.stop();

tui.showOverlay(component, overlayOptions?) → OverlayHandle;
tui.hideOverlay();
tui.hasOverlay();
tui.addInputListener(fn);
tui.onDebug = () => {}; // Shift+Ctrl+D
```

### Overlay options

`width`, `height`, `minWidth`, `maxHeight` (number or `"50%"`), `anchor` (`center`, `top-left`, …), `offsetX/Y`, `row`/`col` (absolute or percent), `margin`, `visible(termW, termH)`, `nonCapturing`.

`OverlayHandle`: `hide()`, `setHidden()`, `focus()`, `unfocus()`, `isFocused()`.

## Component Interface

```typescript
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate?(): void;
}
```

Styles do not carry across lines — reapply per line or use `wrapTextWithAnsi()`.

### Focusable (IME)

Components with text cursor should implement `Focusable`:

```typescript
import { CURSOR_MARKER, type Focusable } from "@earendil-works/pi-tui";

class MyInput implements Component, Focusable {
  focused = false;
  render(width: number): string[] {
    return [`> ${before}${this.focused ? CURSOR_MARKER : ""}\x1b[7m${at}\x1b[27m${after}`];
  }
}
```

Containers with embedded `Input`/`Editor` must propagate `focused` to children.

## Built-in Components

| Component | Purpose |
|-----------|---------|
| `Container` | Group children |
| `Box` | Padding + optional background |
| `Text` | Wrapped multi-line text |
| `TruncatedText` | Single-line ellipsis |
| `Input` | Single-line input |
| `Editor` | Multi-line, autocomplete, paste markers |
| `Markdown` | Rendered markdown + optional `highlightCode` |
| `Loader` / `CancellableLoader` | Spinner; Escape → AbortSignal |
| `SelectList` | Keyboard list picker |
| `SettingsList` | Settings with value cycling / submenus |
| `Spacer` | Empty lines |
| `Image` | Kitty/iTerm2 inline images |

### Editor

```typescript
const editor = new Editor(tui, theme, { paddingX?: number });
editor.onSubmit = (text) => {};
editor.onChange = (text) => {};
editor.setAutocompleteProvider(provider);
editor.disableSubmit = true;
```

Features: `/` slash commands, Tab file paths, large paste → `[paste #N +M lines]`, Shift+Enter / Ctrl+Enter / Alt+Enter for newline.

### SelectList / SettingsList

```typescript
list.onSelect = (item) => {};
list.onCancel = () => {};
list.onSelectionChange = (item) => {};
list.setFilter("query");
```

Arrows navigate; Enter selects; Escape cancels.

## Autocomplete

```typescript
import { CombinedAutocompleteProvider } from "@earendil-works/pi-tui";

const provider = new CombinedAutocompleteProvider(
  [{ name: "help", description: "Show help" }],
  process.cwd(),
);
editor.setAutocompleteProvider(provider);
```

`/` → slash commands; Tab → paths (`~/`, `./`, `@` for attachable files).

## Key Handling

```typescript
import { matchesKey, Key } from "@earendil-works/pi-tui";

matchesKey(data, Key.ctrl("c"));
matchesKey(data, Key.enter);
matchesKey(data, "shift+tab");
```

Supports Kitty keyboard protocol. Use `Key.*` or string identifiers.

## Terminal Interface

Implement for non-stdio environments:

```typescript
interface Terminal {
  start(onInput, onResize): void;
  stop(): void;
  write(data: string): void;
  columns: number;
  rows: number;
  moveBy(lines: number): void;
  hideCursor(): void;
  showCursor(): void;
  clearLine(): void;
  clearFromCursor(): void;
  clearScreen(): void;
}
```

Built-in: `ProcessTerminal`, `VirtualTerminal` (testing with `@xterm/headless`).

## Utilities

```typescript
visibleWidth(str)      // ignore ANSI
truncateToWidth(str, w, ellipsis?)
wrapTextWithAnsi(str, width)
fuzzyFilter(items, query)
```

## Terminal Images

```typescript
import { detectCapabilities, renderImage, getImageDimensions } from "@earendil-works/pi-tui";

const caps = detectCapabilities();
// Image component handles Kitty/iTerm2; fallback text elsewhere
```

Formats: PNG, JPEG, GIF, WebP.

## Custom Component Checklist

1. `render(width)` — never exceed width; use `truncateToWidth`.
2. `handleInput` — use `matchesKey`, call `tui.requestRender()` after state changes.
3. Cache lines; implement `invalidate()` when inputs change.
4. For interactive lists, follow SelectList patterns (up/down/enter/escape).

## Debug

```bash
PI_TUI_WRITE_LOG=/tmp/tui-ansi.log npx tsx your-app.ts
```

## Demo

See pi-mono `packages/tui/test/chat-simple.ts` for markdown chat + loader + editor example.
