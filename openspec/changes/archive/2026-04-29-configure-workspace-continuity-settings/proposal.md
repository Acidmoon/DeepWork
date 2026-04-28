## Why

Cross-session threads and workspace retrieval already exist, but their default behavior is still hardcoded while the settings panel only shows placeholders. The next step is to let users decide how new sessions join threads and how managed CLI retrieval should scope itself by default.

## What Changes

- Persist real workspace-continuity settings for default thread continuation and managed CLI retrieval preference.
- Replace the current CLI retrieval placeholder in the settings panel with live controls while keeping unrelated future settings as placeholders.
- Apply the thread-continuation setting when web, CLI, or manual captures start without an explicit thread selection.
- Apply the retrieval preference to managed CLI bootstrap state so `aw-suggest` uses the configured ranking path and records it in retrieval audits.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `settings-and-panel-extensibility`: Persist and expose real continuity settings instead of keeping CLI retrieval as a placeholder-only preference.
- `context-thread-management`: Let implicit session and capture flows use a configurable default thread-continuation policy when no explicit thread is chosen.
- `cli-workspace-awareness`: Let managed CLI retrieval honor a configurable ranking preference while keeping retrieval outcomes bounded and inspectable.

## Impact

- Affected code: `packages/core/src/desktop/settings.ts`, `packages/core/src/desktop/panels.ts`, desktop renderer settings UI/store/i18n, `apps/desktop/src/main/settings-manager.ts`, `apps/desktop/src/main/workspace-manager.ts`, `apps/desktop/src/main/terminal-manager.ts`, and managed workspace helper scripts.
- Affected behavior: new managed sessions and implicit captures can continue the active thread or create a new thread by default; managed CLI retrieval can stay thread-first or search globally first.
- Validation: retrieval validation and type-check coverage need updates for the new settings-driven behavior.
