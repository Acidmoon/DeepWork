## Why

Terminal panels are now real managed work surfaces with editable panel-level launch configuration, but Settings still exposes `Terminal Behavior` as the last future-facing placeholder. The next useful slice is to turn global terminal interaction behavior into persisted preferences instead of leaving copy/scrollback behavior fixed in renderer code.

## What Changes

- Add persisted global terminal behavior settings for scrollback size, copy-on-selection, and paste-confirmation policy.
- Replace the Settings `Terminal Behavior` placeholder with implemented controls that synchronize through the existing settings IPC flow.
- Apply terminal behavior settings to terminal panel rendering and input handling without restarting PTY sessions.
- Keep shell, working-directory, and startup-command editing in the terminal panel configuration surface rather than duplicating those per-panel fields in Settings.
- Add focused validation that confirms terminal behavior preferences persist and affect terminal panel state.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `settings-and-panel-extensibility`: Persist and expose real terminal behavior settings instead of keeping terminal behavior as a placeholder-only preference.
- `desktop-workbench-panels`: Managed terminal panels honor global terminal interaction preferences while preserving existing session lifecycle and panel-level configuration behavior.
- `desktop-regression-validation`: Focused desktop validation covers terminal behavior settings persistence and renderer synchronization.

## Impact

- Affected code: `packages/core/src/desktop/settings.ts`, `packages/core/src/desktop/panels.ts`, desktop renderer settings UI/store/i18n, terminal panel rendering/input handling, `apps/desktop/src/main/settings-manager.ts`, and desktop validation scripts.
- Affected behavior: future terminal panel instances and currently mounted terminal views use the configured scrollback and interaction preferences; running PTY processes remain stable.
- Dependencies: no new external packages expected.
