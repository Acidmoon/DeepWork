## 1. Baseline Mapping And Configuration

- [x] 1.1 Map the current `TerminalManager` lifecycle, output publication, transcript persistence, and IPC contracts into a short implementation note.
- [x] 1.2 Decide where remote bridge configuration lives and define disabled-by-default settings for Feishu credentials, allowed chat IDs, allowed user IDs, enabled panels, output limits, and lock timeout.
- [x] 1.3 Add configuration normalization and validation for the remote bridge without starting any message intake.
- [x] 1.4 Add tests for default-disabled behavior, invalid configuration rejection, and allowlist normalization.

## 2. Remote Session Adapter Boundary

- [x] 2.1 Define an internal remote session adapter interface for ensure, status, write line, control action, tail, and output subscription.
- [x] 2.2 Implement the PTY adapter over `TerminalManager` for `codex-cli` using the existing managed terminal session.
- [x] 2.3 Extend `TerminalManager` or its surrounding service with non-renderer output subscription support while preserving existing renderer `terminal:output` behavior.
- [x] 2.4 Track last output timestamp, remote-capable panel identity, and remote status fields needed by `/status`.
- [x] 2.5 Add tests proving remote PTY writes use the existing session and do not spawn a duplicate CLI process.

## 3. Locking And Input Coordination

- [x] 3.1 Add remote lock state with owner, chat, timestamp, expiry, and administrative release rules.
- [x] 3.2 Detect recent local terminal input and expose a local-activity window to the PTY adapter.
- [x] 3.3 Reject conflicting remote normal-text input when another remote actor holds the lock or local activity policy blocks input.
- [x] 3.4 Implement `/lock` and `/unlock` command behavior against the selected remote session.
- [x] 3.5 Add tests for lock acquire, lock expiry, lock release, non-owner rejection, and local-activity rejection.

## 4. Feishu Message Intake And Authorization

- [x] 4.1 Choose and integrate the first Feishu intake mode, reusing polling patterns from the adjacent Feishu bridge unless event callbacks are selected before implementation.
- [x] 4.2 Add message deduplication and bot-self filtering for Feishu inbound messages.
- [x] 4.3 Enforce chat and user allowlists before command parsing or session routing.
- [x] 4.4 Parse `/status`, `/start`, `/tail`, `/stop`, `/lock`, `/unlock`, and normal text messages.
- [x] 4.5 Add tests for unauthorized chat rejection, unauthorized user rejection, duplicate message suppression, and command parsing.

## 5. PTY MVP Command Behavior

- [x] 5.1 Implement `/status` response using PTY adapter status fields.
- [x] 5.2 Implement `/start` for the `codex-cli` remote target using the managed terminal start flow.
- [x] 5.3 Implement `/tail` using the managed session buffer or log tail within configured size limits.
- [x] 5.4 Implement `/stop` by sending the configured interrupt sequence through the PTY adapter.
- [x] 5.5 Implement normal text routing as one remote user input action, appending the terminal newline sequence only in the adapter layer.
- [x] 5.6 Add integration tests with a fake PTY adapter covering command behavior and normal message routing.

## 6. Output Cleaning And Feishu Delivery

- [x] 6.1 Add ANSI and terminal redraw cleanup utilities for PTY output.
- [x] 6.2 Add output coalescing, debounce, maximum message length, and truncation notices for Feishu delivery.
- [x] 6.3 Add proactive output delivery policy for important updates while keeping `/tail` as the recovery path.
- [x] 6.4 Add Feishu send/update fallback behavior for card or streaming update failures.
- [x] 6.5 Add tests for ANSI cleanup, output truncation, debounce/coalescing, and fallback plain-text delivery.

## 7. Audit And Operator Visibility

- [x] 7.1 Add audit records for accepted remote input with actor, chat, target, timestamp, and input length.
- [x] 7.2 Add audit records for remote control commands and results.
- [x] 7.3 Add audit records for rejected actions without leaking terminal content.
- [x] 7.4 Surface remote bridge status in an operator-accessible location such as logs, settings diagnostics, or a compact workspace artifact.
- [x] 7.5 Add tests for audit emission across accepted, rejected, and control-command paths.

## 8. Desktop Compatibility Verification

- [x] 8.1 Verify local xterm.js attach, start, restart, write, resize, and clear still work while the remote bridge is enabled.
- [x] 8.2 Verify remote output subscription survives renderer panel switches.
- [x] 8.3 Verify workspace transcript persistence and retrieval audit sync are not broken by remote writes.
- [x] 8.4 Add regression tests or smoke coverage for local terminal behavior with the remote adapter installed.

## 9. Codex App-Server Research Spike

- [x] 9.1 Detect installed Codex support for `codex app-server` and required JSON-RPC methods.
- [x] 9.2 Generate or vendor matching TypeScript/JSON schema artifacts for the supported Codex app-server version.
- [x] 9.3 Prototype initialize, thread start, turn start, turn interrupt, and event reading behind a non-default adapter.
- [x] 9.4 Document protocol version assumptions, auth/transport choices, and fallback behavior when app-server is unavailable.

## 10. Structured Codex Adapter

- [x] 10.1 Implement a Codex app-server adapter behind an explicit feature flag or target mode.
- [x] 10.2 Map idle normal text to `turn/start` and active steerable text to `turn/steer`.
- [x] 10.3 Map `/stop` to `turn/interrupt` using the active thread and turn identity.
- [x] 10.4 Translate structured Codex item and turn events into Feishu progress, tool, final, and error messages.
- [x] 10.5 Persist or associate Codex thread identity with the selected DeepWork work surface.
- [x] 10.6 Add adapter tests using a fake JSON-RPC app-server transport.

## 11. Mode Selection And Migration

- [x] 11.1 Add explicit target mode selection for PTY mode versus Codex app-server mode.
- [x] 11.2 Ensure Feishu conversations never silently switch modes without configuration or authorized command input.
- [x] 11.3 Add rollback behavior that disables structured mode and returns the target to PTY mode without affecting the local terminal panel.
- [ ] 11.4 Run an end-to-end manual validation pass from mobile Feishu through PTY mode before enabling structured mode.
- [ ] 11.5 Run an end-to-end manual validation pass from mobile Feishu through Codex app-server mode after feature parity is reached.
