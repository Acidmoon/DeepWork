## Context

The desktop app already persists core application settings, maintains cross-session workspace threads, and bootstraps managed CLI sessions with workspace helper commands. Today, two continuity decisions are fixed in code: implicit captures always continue the active thread, and `aw-suggest` always prefers the active thread before global fallback. The settings panel still presents CLI retrieval as a placeholder, so users cannot tune continuity behavior even though the runtime machinery already exists.

This change touches shared settings types in `packages/core`, renderer settings state, the main-process settings/workspace/terminal managers, and the generated PowerShell helper script. The design needs to keep existing workspace data valid and avoid rewriting previously saved artifacts.

## Goals / Non-Goals

**Goals:**
- Persist two real settings with safe defaults: thread continuation and managed CLI retrieval preference.
- Make those settings editable from the settings panel and synchronize them without manual file edits.
- Apply the thread-continuation setting consistently to implicit capture flows that do not already specify a thread.
- Apply the retrieval setting to managed CLI sessions and preserve the selected retrieval mode in audit records.

**Non-Goals:**
- Per-panel or per-agent continuity overrides.
- Prompting the user on every session start.
- Changing default workspace selection or broader terminal behavior settings.
- Moving the remaining desktop business logic into `packages/core` as part of this change.

## Decisions

### 1. Add two first-class app settings in the shared settings model

The core settings snapshot will gain one enum for implicit thread continuation and one enum for managed CLI retrieval preference. Defaults will preserve current behavior so existing installs remain stable after upgrade.

Why:
- The settings model already acts as the contract between main process and renderer.
- Explicit enums make invalid persisted values easy to coerce back to defaults.

Alternative considered:
- Reusing the free-form notes area or adding ad hoc JSON was rejected because runtime managers need typed values and live synchronization.

### 2. Centralize implicit thread resolution inside `WorkspaceManager`

`WorkspaceManager` will own a single resolver for “no explicit thread was provided” flows. In `continue-active-thread` mode it will reuse the active thread or create one if necessary. In `start-new-thread-per-scope` mode it will create one new thread for a previously unseen scope and reuse that thread for later writes to the same scope.

Why:
- Web capture, terminal transcript capture, and manual saves all eventually pass through `WorkspaceManager`.
- Per-scope reuse avoids creating a fresh thread on every autosave while still allowing new sessions to branch away from the current thread by default.

Alternatives considered:
- Creating a new thread on every write was rejected because web autosave would explode thread count.
- Implementing separate thread logic in each manager was rejected because it would drift and break consistency.

### 3. Pass retrieval preference to managed CLI sessions through bootstrap environment

`TerminalManager` will inject the current retrieval preference into session environment variables and refresh running sessions by re-running the workspace bootstrap when the setting changes. The generated `aw-suggest` helper will read that environment variable to choose between thread-first ranking and global-first ranking.

Why:
- The helper already relies on environment variables for workspace, session, and thread identity.
- This keeps retrieval behavior session-scoped and easy to audit without rewriting the whole tools file for every change.

Alternatives considered:
- Rebuilding `WORKBENCH_TOOLS.ps1` per setting change was rejected because it complicates state sync and would still require per-session propagation.

## Risks / Trade-offs

- [More threads when using new-thread-per-scope] -> Reuse an existing thread when the same implicit scope is captured again instead of creating a thread on every write.
- [Running terminals could keep stale retrieval behavior] -> Reapply the bootstrap environment to live sessions when settings change.
- [Existing invalid settings files may contain unknown values] -> Coerce unsupported values back to defaults during settings load.
- [UI copy may drift from runtime behavior] -> Keep the settings UI driven from the same typed values and defaults used by the main process.

## Migration Plan

No workspace artifact migration is required. Existing `settings.json` files will load with new defaults when the new keys are absent or invalid. Existing threads, scope manifests, and retrieval logs remain valid because the change only affects how future implicit captures and future CLI retrievals choose their default behavior.

## Open Questions

- None for this slice. If users later need per-panel continuity overrides, that should be proposed as a separate change.
