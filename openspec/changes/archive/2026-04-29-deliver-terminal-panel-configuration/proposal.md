## Why

DeepWork's managed terminal sessions already handle workspace bootstrap, thread continuity, retrieval auditing, and transcript persistence, but their runtime configuration is still mostly hardcoded or hidden behind read-only UI. Users can create custom CLI panels and the settings model already stores shell-level fields, yet changing startup command, working directory, or built-in CLI defaults still requires code edits or direct JSON manipulation.

## What Changes

- Deliver editable terminal-panel configuration surfaces for built-in and custom CLI panels.
- Persist built-in CLI panel overrides for supported fields such as working directory and startup command while keeping managed shell/bootstrap ownership in the app.
- Allow custom CLI panels to edit shell, shell arguments, working directory, and startup command through the workbench instead of only through initial creation defaults.
- Define how configuration changes synchronize into renderer state and terminal runtime, including explicit restart/apply behavior for already running sessions.
- Keep global terminal preferences separate from panel-level configuration so this change does not expand into a full terminal policy system.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `settings-and-panel-extensibility`: extend persisted settings and panel configuration flows to cover built-in terminal overrides and richer custom CLI panel editing.
- `desktop-workbench-panels`: extend managed terminal panels so their persisted configuration can be inspected, edited, synchronized, and applied predictably at runtime.

## Impact

- Affected code: `packages/core/src/desktop/settings.ts`, `packages/core/src/desktop/terminal-panels.ts`, `packages/core/src/desktop/panels.ts`, renderer terminal/settings synchronization, `apps/desktop/src/main/terminal-manager.ts`, and terminal-related IPC handlers.
- Affected systems: persisted application settings, renderer panel state hydration, managed PTY session startup/restart behavior, and terminal panel UX.
- Dependencies: no new external packages expected; this change should build on the existing Electron, PTY, and settings persistence stack.
