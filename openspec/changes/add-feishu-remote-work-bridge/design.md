## Context

DeepWork currently owns live terminal sessions in the Electron main process through `TerminalManager`. Built-in panels such as `codex-cli` and `claude-code` are PTY-backed sessions launched from the desktop app, with renderer access mediated through preload IPC. The output stream is already buffered, logged, persisted into workspace artifacts, and delivered to xterm.js through `terminal:output`.

The desired remote endpoint is not a remote terminal emulator. It is a Feishu message bot used primarily from a phone. That changes the target shape: the bridge should provide conversational input, concise status, control commands, and summarized output from the same local work session rather than trying to reproduce a full xterm.js interface inside chat.

Adjacent references influence the design:

- The local Feishu bridge project is useful for Feishu polling, message sending, streaming card updates, deduplication, and command parsing, but its Claude process model must not be reused because it starts an independent agent process.
- cc-connect is useful for the `Platform -> Engine -> AgentSession` separation and its Codex app-server work, but DeepWork must remain the owner of local sessions.
- OpenAI Codex exposes `codex app-server` with JSON-RPC methods such as `thread/start`, `thread/resume`, `turn/start`, `turn/steer`, and `turn/interrupt`; this is the preferred long-term structured interface for a message bot.

## Goals / Non-Goals

**Goals:**

- Let a Feishu bot remotely drive the same DeepWork-owned Codex work session that is visible locally.
- Deliver a practical mobile UX through commands, conversational input, output tailing, and concise progress messages.
- Keep PTY sharing as the first implementation stage because it fits the current `codex-cli` panel without replacing the existing terminal experience.
- Preserve local desktop behavior: xterm.js attach/start/write/resize/clear flows must keep working as they do today.
- Add authorization, lock ownership, auditability, and bounded output delivery before enabling remote control.
- Define a clean long-term path to Codex app-server so Feishu can eventually consume structured turn events instead of terminal text.

**Non-Goals:**

- Render a full interactive terminal UI in Feishu.
- Spawn a second Codex or Claude process for remote work when a DeepWork panel already owns the session.
- Implement app-server migration in the first PTY MVP unless explicitly scoped in a later phase.
- Support arbitrary public multi-user remote access; initial access is restricted to configured Feishu chats and users.
- Replace existing workspace transcript persistence or terminal renderer behavior.

## Decisions

### Decision: Build the first bridge inside DeepWork around `TerminalManager`

The bridge will live in the DeepWork desktop main-process side or a main-process-owned service that can call `TerminalManager.start`, `attach`, `write`, and subscribe to output events. This keeps a single PTY owner and avoids cross-process races with an external bridge trying to infer terminal state from logs.

Alternative considered: run the adjacent Feishu project as a separate process and let it spawn Codex or Claude. This was rejected because it creates a second agent session and violates the shared local/remote work-session goal.

### Decision: Treat Feishu as a message control plane, not a terminal renderer

Remote messages map to high-level actions:

- Normal text sends a line to the selected PTY, usually `text + "\r"`.
- `/status` reports panel, running state, PID, cwd, lock owner, last output time, and configured mode.
- `/start` starts the remote-enabled panel if it is not running.
- `/tail [n]` returns recent cleaned output.
- `/stop` sends Ctrl+C to the PTY.
- `/lock` and `/unlock` manage write ownership.
- Future `/panel <id>` selects a configured remote-capable work surface.

Output sent back to Feishu will be ANSI-cleaned, rate-limited, deduplicated, and summarized. The bot should prefer output tails, final/idle notices, and explicit command responses over pushing every terminal redraw.

Alternative considered: stream raw terminal output to Feishu as messages. This was rejected because Codex TUI redraws with ANSI control sequences, mobile chat has tight readability and rate limits, and raw streaming would be noisy and fragile.

### Decision: Introduce a remote session adapter boundary

The Feishu integration should target a small internal interface rather than `TerminalManager` directly everywhere:

- `ensureSession(panelId)`
- `getStatus(panelId)`
- `writeLine(panelId, text, actor)`
- `sendControl(panelId, control, actor)`
- `tail(panelId, options)`
- `subscribeOutput(panelId, listener)`

For the MVP this interface is implemented by a PTY adapter over `TerminalManager`. Later the same remote bridge can add a Codex app-server adapter without rewriting Feishu message intake, command routing, authorization, or output delivery.

Alternative considered: bake Feishu command handling directly into `TerminalManager`. This was rejected because Feishu behavior, authorization, and message formatting are platform concerns, while `TerminalManager` should remain a local terminal lifecycle manager.

### Decision: Add an explicit remote coordination model

Remote writes must be coordinated because the desktop terminal and Feishu can both write to the same PTY. The MVP will use a coarse lock:

- No lock means either local or remote can write, but remote normal-text writes may be rejected when a local-input debounce window is active.
- `/lock` claims remote ownership for a configured duration.
- `/unlock` releases remote ownership.
- Local terminal input can either break the lock with visible audit messaging or mark the session as locally active and reject remote normal text until idle, depending on final configuration.

Alternative considered: allow uncontrolled concurrent writes. This was rejected because interactive CLIs have a single prompt and character stream; mixed local and remote input can corrupt prompts and approvals.

### Decision: Keep security explicit and conservative

Remote access must be disabled by default until configured. The bridge will require configured Feishu app credentials, allowed chat IDs, and allowed user IDs or admin roles. Remote commands are scoped to known panels and control actions. Dangerous future actions such as restart or panel switching across workspaces require explicit authorization checks and audit entries.

Alternative considered: let any message reaching the bot write to the terminal. This was rejected because the bridge controls a local machine and can trigger shell commands indirectly through the agent.

### Decision: Plan a Codex app-server adapter as the long-term path

Codex app-server is a better fit for a mobile message bot because it emits structured thread, turn, item, tool, permission, and completion events. The long-term adapter should:

- Start or connect to a DeepWork-owned `codex app-server`.
- Create or resume a thread associated with the work surface.
- Map Feishu text to `turn/start` when idle and `turn/steer` when a steerable turn is running.
- Map `/stop` to `turn/interrupt`.
- Convert structured item events into Feishu progress, tool, and final response messages.
- Optionally run the local Codex TUI against the same remote app-server thread if a terminal-like local view is still desired.

Alternative considered: invest heavily in terminal ANSI parsing. This was rejected for the long term because app-server already exposes the semantic events the bot needs.

## Risks / Trade-offs

- PTY output is noisy and TUI-oriented -> Mitigation: clean ANSI, debounce, tail output, and treat Feishu as a command/status interface rather than a full transcript stream.
- Remote and local input can collide -> Mitigation: lock ownership, local activity detection, write rejection with clear messages, and audit logs.
- Feishu rate limits or card update failures can drop progress -> Mitigation: bounded buffers, fallback plain-text messages, and `/tail` for manual recovery.
- Remote access expands the local attack surface -> Mitigation: disabled-by-default configuration, allowlists, scoped commands, no arbitrary panel access by default, and audit records for every remote write/control command.
- PTY MVP may not detect Codex semantic completion reliably -> Mitigation: expose `/tail` and status first, then incrementally add idle heuristics; rely on app-server for semantic completion in the long-term phase.
- App-server behavior may vary by Codex version -> Mitigation: generate or vendor matching protocol schema per supported Codex version and gate app-server mode behind feature detection.

## Migration Plan

1. Add the remote bridge configuration model with remote access disabled by default.
2. Add a main-process remote session adapter over `TerminalManager` without changing renderer IPC behavior.
3. Add Feishu message intake and sending using configured credentials and allowlists.
4. Enable only the `codex-cli` panel for the first remote PTY MVP.
5. Add output cleaning, throttling, lock coordination, and audit events.
6. Add validation tests for command routing, authorization, output bounds, and PTY adapter behavior.
7. Later, add a Codex app-server adapter behind an explicit mode flag.
8. Migrate selected users from PTY mode to app-server mode after parity for start, send, stop, status, output delivery, and session continuity is verified.

Rollback is straightforward for the PTY MVP: disable the remote bridge configuration and stop message intake. Existing terminal sessions and desktop panels continue to work because the bridge is additive.

## Open Questions

- Should local input automatically release a remote lock, or should it only mark the session locally active and require `/unlock` from the remote owner?
- Should the first Feishu intake use polling from the adjacent project or Feishu event callbacks? Polling is easier for local desktop development; callbacks are better for production latency and reliability.
- Should remote bridge configuration live in the existing settings snapshot, an environment-only configuration, or a separate secrets-backed file?
- How much terminal output should be pushed proactively versus requiring `/tail`?
- When app-server mode arrives, should the local Codex panel become `codex --remote ws://127.0.0.1:<port>` or should DeepWork render a structured Codex panel instead of a TUI?
