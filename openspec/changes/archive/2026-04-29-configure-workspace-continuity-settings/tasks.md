## 1. Settings Model

- [x] 1.1 Extend the shared desktop settings and settings-panel view state with typed continuity preferences and stable defaults.
- [x] 1.2 Update desktop settings persistence so the new continuity preferences are loaded, sanitized, and written back through the existing IPC flow.

## 2. Runtime Wiring

- [x] 2.1 Replace the CLI retrieval placeholder in the renderer settings panel with live controls, localized labels, and store synchronization for the new continuity preferences.
- [x] 2.2 Make `WorkspaceManager` apply the configured thread-continuation preference for implicit web, CLI, and manual capture flows while preserving explicit thread selection.
- [x] 2.3 Make `TerminalManager` and the managed workspace bootstrap pass the configured retrieval preference into `aw-suggest` so retrieval mode becomes settings-driven and auditable.

## 3. Verification

- [x] 3.1 Update retrieval validation coverage for the new settings-driven retrieval modes.
- [x] 3.2 Run desktop type-check and retrieval validation to verify the change end to end.
