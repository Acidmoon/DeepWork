## Context

DeepWork already persists application settings, synchronizes them through the renderer store, and uses terminal panel details for panel-specific launch configuration. The remaining `Terminal Behavior` Settings placeholder is app-global, not panel-specific: it should control interaction behavior such as scrollback and clipboard safety while leaving shell, working directory, startup command, and restart-to-apply behavior in the terminal panel surface.

This change crosses shared settings types, renderer settings controls, terminal panel rendering/input behavior, and validation. It should preserve running PTY sessions and avoid introducing another terminal configuration model that overlaps with custom CLI panel settings.

## Goals / Non-Goals

**Goals:**
- Add typed, persisted global terminal behavior settings with backward-compatible defaults.
- Replace the terminal behavior placeholder in Settings with live controls.
- Apply behavior settings to terminal panels without restarting or recreating PTY sessions.
- Keep built-in and custom panel launch configuration in the terminal panel details surface.
- Add focused validation for persistence and renderer synchronization.

**Non-Goals:**
- Replacing xterm.js, node-pty, or the terminal manager lifecycle.
- Adding per-panel overrides for scrollback or clipboard behavior.
- Changing managed workspace bootstrap, retrieval helpers, or transcript persistence.
- Extending built-in terminal panels to arbitrary shell ownership.

## Decisions

### 1. Persist one global terminal behavior object in app settings

Add a typed `terminalBehavior` settings object with `scrollbackLines`, `copyOnSelection`, and `confirmPaste` fields.

Why:
- The settings model is already the stable contract between the renderer and main process.
- A single object leaves room for related terminal interaction preferences without adding several unrelated top-level keys.
- Defaults preserve the current conservative behavior.

Alternative considered:
- Store these preferences in panel view state only. Rejected because behavior must persist across restarts and apply consistently to all terminal panels.

### 2. Normalize terminal behavior at the settings boundary

Settings normalization should coerce missing, invalid, or out-of-range values to defaults before snapshots reach the renderer or managers.

Why:
- Older settings files will not have the new object.
- Renderer controls can assume valid values and avoid duplicate defensive parsing.

Alternative considered:
- Let each consumer validate the fields. Rejected because validation would drift and make persisted settings harder to reason about.

### 3. Apply renderer-side behavior without PTY restart

`scrollbackLines` updates should reconfigure xterm options when terminal views are mounted or settings change. `copyOnSelection` and `confirmPaste` should affect renderer event handling before text is sent to the PTY.

Why:
- These are UI/interaction preferences, not launch-time PTY configuration.
- Restarting terminals for clipboard or scrollback changes would be surprising and could interrupt active work.

Alternative considered:
- Pass terminal behavior through `TerminalManager` and require restart-to-apply. Rejected because it treats renderer-only preferences like shell launch configuration.

### 4. Keep paste confirmation simple and deterministic

The first implementation should support an always-confirm or never-confirm policy for multi-line paste. Confirmation can use the existing browser confirmation primitive or an equivalent renderer-level guard; canceling MUST leave the PTY untouched.

Why:
- Multi-line paste is the main destructive clipboard risk for terminal workflows.
- A binary preference is enough to replace the placeholder without committing to a complex terminal policy engine.

Alternative considered:
- Add fine-grained rules for bracketed paste, command detection, or trusted panels. Rejected as a larger policy surface that should follow real usage evidence.

## Risks / Trade-offs

- [Scrollback changes cannot reconstruct already discarded terminal history] -> Apply the new limit to future buffer retention and document it as an interaction preference.
- [Paste confirmation could become noisy] -> Scope confirmation to multi-line paste only and allow users to disable it.
- [Clipboard APIs may be unavailable in renderer validation] -> Keep copy-on-selection guarded and validate through state/control synchronization rather than relying on host clipboard mutation.
- [Settings and panel launch configuration could confuse users] -> Keep launch fields in terminal details and terminal behavior fields in Settings with distinct copy.

## Migration Plan

No workspace or terminal session migration is required. Existing settings files hydrate with default `terminalBehavior` values when absent or invalid. Rollback can ignore the additive settings object and restore the Settings placeholder without corrupting existing panel configuration.

## Open Questions

- None for this slice. More granular terminal policies should be proposed separately if needed.
