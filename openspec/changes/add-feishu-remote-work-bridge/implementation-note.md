## TerminalManager Baseline

`TerminalManager` owns PTY-backed terminal sessions in the Electron main process. It creates one `ManagedTerminalSession` per built-in or custom terminal panel, keyed by panel id. Built-in panels are seeded from `terminalPanelConfigs`; custom panels are synchronized from settings.

### Lifecycle

- `attach(panelId)` returns the existing snapshot and buffer without spawning a PTY.
- `start(panelId)` returns the current snapshot when a PTY is already running, otherwise it spawns the configured shell through `node-pty`.
- `restart(panelId)` disposes the current PTY and calls `start(panelId)`.
- `disposeSession()` writes Ctrl+C and `exit`, then kills the PTY after a short delay during shutdown or restart.
- Session launch metadata is attached through `createManagedSessionIdentity()` and environment variables such as `AI_WORKBENCH_SESSION_PANEL_ID`, `AI_WORKBENCH_SESSION_SCOPE_ID`, and retrieval audit paths.

### Output Publication

- PTY `onData` appends raw output to the bounded in-memory session buffer and terminal log file.
- The same `onData` path updates the terminal snapshot and publishes renderer events through `terminal:state-changed` and `terminal:output`.
- Renderer-facing behavior is currently one-way IPC from main to preload listeners; no non-renderer subscriber list exists yet.

### Transcript Persistence

- Meaningful user input flips `hasMeaningfulUserInput`, resets the transcript capture buffer for the new interaction, and allows output capture.
- Output is captured in `captureBuffer`, bounded by `MAX_TRANSCRIPT_CAPTURE_SIZE`, with a truncation notice when needed.
- `scheduleTranscriptPersist()` debounces persistence into workspace artifacts through the injected `persistTerminalTranscript` callback.
- Retrieval audit synchronization uses the session scope path and the injected `syncRetrievalAuditArtifacts` callback.

### IPC Contracts

- Preload exposes `terminals.attach`, `getState`, `start`, `restart`, `write`, `resize`, `clear`, `onOutput`, and `onStateChanged`.
- Main process handlers guard panel ids, terminal writes, and resize payloads before calling `TerminalManager`.
- Existing renderer `terminal:output` and `terminal:state-changed` event names must remain stable when remote subscriptions are added.

## Remote Bridge Configuration Decision

The first remote bridge configuration lives in `AppSettingsSnapshot.remoteBridge` and is normalized by `SettingsManager`. This keeps enablement, target mode, allowlists, panel selection, output limits, and lock policy with the rest of the desktop runtime settings while the bridge is still additive and disabled by default.

Secrets are represented as Feishu credential fields in the settings model for the MVP, but the bridge does not start intake until validation passes and `enabled` is true. A later secrets-backed store can move `appSecret`, verification token, and encrypt key without changing the rest of the runtime configuration shape.

Default behavior is conservative:

- `enabled: false`
- `intakeMode: polling`
- `targetMode: pty`
- empty Feishu credentials
- empty chat, user, and admin allowlists
- `codex-cli` as the initial configured remote-capable panel, gated by the disabled master switch
- bounded output tail/message/debounce defaults
- finite lock timeout and local-activity block window

`validateRemoteBridgeSettings()` rejects enabled configurations that are missing app credentials, chat allowlists, user allowlists, enabled panels, or a default panel included in the enabled panel list. No Feishu message intake is created in this baseline step.
