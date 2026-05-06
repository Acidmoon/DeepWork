## Why

DeepWork already owns persistent PTY-backed Codex and Claude Code work surfaces, but those sessions can only be driven from the local desktop. The project needs a mobile-friendly remote work bridge so a user can continue, steer, interrupt, and inspect the same local Codex work session from Feishu without spawning an independent agent process.

## What Changes

- Introduce a Feishu remote work bridge that receives bot messages and routes them to DeepWork-managed work sessions.
- Add a PTY-backed MVP path for Codex where Feishu messages write to the existing `codex-cli` PTY and receive cleaned, throttled output summaries from that same session.
- Add remote control commands for session status, start, tail, stop, lock, unlock, and future panel selection.
- Ensure remote input is coordinated with local terminal use so the mobile bot and desktop terminal do not corrupt the same session through uncontrolled simultaneous writes.
- Define an evolution path from PTY sharing to Codex app-server sharing, where Feishu can eventually drive the same Codex thread through structured `thread/*` and `turn/*` APIs instead of parsing terminal output.
- Reuse concepts from the adjacent Feishu bridge and cc-connect where they fit the message-bot product shape, while keeping DeepWork as the owner of the local session.

## Capabilities

### New Capabilities
- `feishu-remote-work-bridge`: Feishu bot integration for remote message intake, command routing, output delivery, authorization, and session coordination.
- `remote-pty-session-control`: Remote control contract for attaching a message-based client to a DeepWork-managed PTY session without creating a duplicate CLI process.
- `codex-structured-remote-session`: Long-term structured Codex session integration using Codex app-server threads and turns as an alternative to PTY text bridging.

### Modified Capabilities
- `desktop-workbench-panels`: Managed terminal panels must support remote bridge access to the same PTY session lifecycle and output stream while preserving local renderer behavior.

## Impact

- Affected code: Electron main process, `TerminalManager`, preload-facing terminal contracts, settings/configuration, Feishu bridge modules, and optional future Codex app-server client modules.
- Affected systems: local PTY sessions, workspace/session continuity metadata, terminal transcript capture, Feishu Open Platform message polling or event intake, and Codex CLI/app-server integration.
- Dependencies may include Feishu SDK/API client utilities, ANSI stripping/output normalization utilities, throttling/debounce helpers, and eventually a JSON-RPC websocket or stdio client for Codex app-server.
- Security impact: remote access needs explicit enablement, trusted chat/user restrictions, command scoping, lock ownership, audit logging, and safe handling of stop/restart commands.
