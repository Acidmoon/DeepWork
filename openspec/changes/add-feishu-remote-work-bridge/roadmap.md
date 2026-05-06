# Feishu Remote Work Bridge Long-Term Roadmap

This roadmap is the planning source for future changes related to DeepWork remote work through Feishu. Later OpenSpec changes for this area should derive from one or more roadmap phases below instead of introducing unrelated scope.

## Planning Rule

Future changes in this domain SHOULD reference this roadmap and state which phase or task range they implement.

Examples:

- `implement-remote-bridge-config`: derives from Phase 1.
- `add-remote-pty-adapter`: derives from Phases 2 and 3.
- `add-feishu-message-intake`: derives from Phase 4.
- `add-codex-app-server-adapter`: derives from Phases 9 and 10.

If a future change does not fit any phase here, update this roadmap first or create a new higher-level planning change before implementation.

## Long-Term Direction

DeepWork owns the local work session. The local user works through the desktop PTY/TUI. The remote user works through a Feishu message bot, usually from mobile. Both must steer the same DeepWork-owned work context.

The remote endpoint is not a full terminal emulator. It is a message-based control plane that sends concise input, commands, status, and output summaries.

## Architecture Evolution

### Stage 1: PTY Bridge MVP

Use the existing DeepWork `TerminalManager` and `codex-cli` PTY as the source of truth.

Remote Feishu messages:

- Route normal text into the same PTY.
- Expose `/status`, `/start`, `/tail`, `/stop`, `/lock`, and `/unlock`.
- Clean and throttle terminal output before sending it to Feishu.
- Keep the local xterm.js terminal behavior unchanged.

This stage proves the shared local/remote work model without changing how Codex is currently launched.

### Stage 2: Stable Remote Operation

Harden the PTY MVP for real use:

- Authorization and allowlists.
- Remote/local input coordination.
- Audit records.
- Output bounds and fallback delivery.
- Manual end-to-end validation from mobile Feishu.

This stage should make the PTY bridge reliable enough for day-to-day remote work.

### Stage 3: Codex App-Server Spike

Validate Codex app-server support in the installed Codex CLI and prototype the structured adapter.

This stage should answer:

- Which Codex version and protocol schema are supported?
- Which transport should DeepWork use first?
- How do `thread/start`, `thread/resume`, `turn/start`, `turn/steer`, and `turn/interrupt` map to the Feishu bot?
- What is the fallback when app-server is unavailable?

### Stage 4: Structured Codex Remote Session

Move Codex remote work from PTY text parsing to Codex app-server structured events.

The Feishu bridge should:

- Start or resume the selected Codex thread.
- Send idle input through `turn/start`.
- Send active-turn input through `turn/steer` when supported.
- Interrupt work through `turn/interrupt`.
- Convert structured item and turn events into Feishu progress and final messages.

PTY mode remains available as a fallback or for non-Codex terminals.

### Stage 5: Mode Selection And Productization

Make PTY mode and structured Codex mode explicit operator choices.

The system should:

- Never silently switch a Feishu conversation between PTY and app-server modes.
- Provide rollback from app-server mode to PTY mode.
- Preserve local desktop use throughout the migration.
- Document operational setup for Feishu credentials, allowlists, and Codex app-server requirements.

## Source Task Ranges

- Phase 1: `tasks.md` sections 1-3.
- Phase 2: `tasks.md` sections 4-8.
- Phase 3: `tasks.md` section 9.
- Phase 4: `tasks.md` section 10.
- Phase 5: `tasks.md` section 11.

## Non-Negotiable Constraints

- Do not spawn a second remote-only Codex process for the same DeepWork work session.
- Do not treat Feishu as a raw terminal renderer.
- Do not enable remote access by default.
- Do not route unauthorized Feishu messages to local PTY or Codex app-server sessions.
- Do not break existing desktop terminal panel behavior while adding remote access.
