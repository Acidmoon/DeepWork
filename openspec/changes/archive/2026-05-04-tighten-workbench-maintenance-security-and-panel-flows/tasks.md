## 1. OpenSpec Change Hygiene

- [x] 1.1 Identify active changes under `openspec/changes/` whose task lists are fully complete and whose specs validate cleanly.
- [x] 1.2 Archive completed changes through the normal OpenSpec archive workflow without manually moving change directories.
- [x] 1.3 Leave incomplete or still-planned changes active and document any reason they are intentionally not archived.
- [x] 1.4 Add or document a repeatable release-readiness check that reports completed active changes as archive candidates.

## 2. IPC and Preload Boundary Hardening

- [x] 2.1 Add small runtime guard helpers for IPC strings, optional strings, enum values, bounded terminal input, panel bounds, settings updates, and workspace mutation IDs.
- [x] 2.2 Apply guards to web-panel IPC handlers before navigation, bounds, show/hide, and configuration update calls reach `WebPanelManager`.
- [x] 2.3 Apply guards to terminal IPC handlers before attach, start, restart, write, resize, and clear calls reach `TerminalManager`.
- [x] 2.4 Apply guards to workspace IPC handlers before artifact reads, scope/thread mutations, resync, profile open, maintenance operations, and clipboard artifact saves reach `WorkspaceManager`.
- [x] 2.5 Apply guards or explicit normalization boundaries to settings IPC updates before dependent managers synchronize runtime configuration.
- [x] 2.6 Test whether the main-window preload bridge can run with `sandbox: true`; enable it if compatible, or document the blocker and keep validation coverage for the remaining hardened posture.

## 3. In-App Custom Panel Management

- [x] 3.1 Replace the custom web panel `window.prompt` add flow with an in-app editor that captures title and HTTP/HTTPS home URL.
- [x] 3.2 Add in-app validation and error rendering for invalid custom web panel creation without persisting rejected settings.
- [x] 3.3 Replace custom CLI panel creation with an in-app flow that makes the initial persisted configuration explicit before saving.
- [x] 3.4 Replace custom web panel deletion `window.confirm` with an in-app destructive confirmation state.
- [x] 3.5 Replace custom CLI panel deletion `window.confirm` with an in-app destructive confirmation state.
- [x] 3.6 Preserve existing settings synchronization, navigation hydration, runtime manager sync, and open-after-create behavior for valid custom panels.

## 4. Validation

- [x] 4.1 Extend security-boundary validation to exercise malformed IPC payloads for terminal, web-panel, workspace, settings, and clipboard-backed operations.
- [x] 4.2 Extend custom panel renderer validation to create custom web and CLI panels through the new in-app flows.
- [x] 4.3 Extend custom panel renderer validation to cover invalid custom web URL submission, delete cancellation, and delete confirmation.
- [x] 4.4 Run `npm run typecheck`.
- [x] 4.5 Run `npm run validate:security-boundaries`, `npm run validate:custom-web-panels`, and any affected renderer validation flows.
- [x] 4.6 Run `npx openspec validate --all --strict`.
