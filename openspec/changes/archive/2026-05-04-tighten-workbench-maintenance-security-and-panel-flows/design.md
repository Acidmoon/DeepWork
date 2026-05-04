## Context

DeepWork already has strict TypeScript settings, focused desktop validation flows, and several security-boundary checks. The remaining release-readiness gaps are mostly cross-cutting: completed OpenSpec changes remain listed as active work, the preload bridge forwards renderer-originated values directly into broad IPC handlers, and custom panel creation/deletion still relies on native browser dialogs rather than the app's own management surface.

The implementation must preserve the current Electron architecture: renderer code calls a constrained preload API, the main process owns filesystem, PTY, settings, and `WebContentsView` operations, and shared normalization helpers live in `packages/core` where practical.

## Goals / Non-Goals

**Goals:**

- Make active OpenSpec changes reflect only work that is genuinely planned or in progress.
- Add a small, explicit IPC validation layer before renderer-originated payloads reach managers.
- Keep the main process as the final trust boundary even if renderer-side controls already validate input.
- Replace native custom panel prompts and destructive confirmations with in-app flows that have explicit save, cancel, validation, and error states.
- Extend validation to cover the new boundary and UI contracts.

**Non-Goals:**

- Rewriting the full preload API surface or replacing Electron IPC with a new transport.
- Changing workspace persistence formats except where validation requires safer normalized inputs.
- Removing supported custom web or CLI panel capabilities.
- Introducing a general-purpose form framework or modal library.
- Archiving incomplete or speculative OpenSpec changes.

## Decisions

1. Introduce narrow runtime guards near IPC registration.

   Each high-impact handler in `apps/desktop/src/main/index.ts` should validate primitive shape, enum values, bounded strings, and object ranges before calling manager methods. This keeps the final enforcement in the main process and avoids relying on TypeScript or renderer controls for untrusted IPC payloads. The alternative was only validating in preload, but preload is still renderer-adjacent and does not protect future IPC callers or test harnesses.

2. Keep domain normalization in shared or manager modules, and keep IPC validation shallow.

   IPC guards should reject malformed payloads and enforce size/range limits; existing domain normalizers should continue to canonicalize supported values such as web URLs, settings snapshots, workspace paths, and terminal behavior. The alternative was duplicating every domain rule in the IPC layer, which would create drift.

3. Treat preload sandbox as an explicit decision point.

   The change should first test whether `sandbox: true` works with the current preload bridge and validation flows. If it does not, the implementation must document the blocker in code or validation notes and keep a regression check proving the rest of the Electron hardening posture remains intact. This is preferable to silently leaving `sandbox: false` without a tracked reason.

4. Replace native dialogs with local renderer state and app UI.

   Custom web creation should become an in-app form that validates HTTP/HTTPS URLs before persistence. Custom CLI creation should expose editable initial configuration or a clear create-and-edit flow. Deletion should use an in-app confirmation affordance for user-defined panels. The alternative was wrapping `window.prompt` and `window.confirm`, but that would preserve inaccessible and hard-to-validate UX.

5. Archive completed OpenSpec changes using the existing archive workflow, not manual file moves.

   The implementation should identify changes whose tasks are complete, validate them, and archive through the OpenSpec command path so spec updates are applied consistently. Manual moves risk bypassing spec validation and losing change metadata.

## Risks / Trade-offs

- IPC guards may reject payloads that current tests or renderer code send loosely. Mitigation: add guards incrementally, keep error returns stable, and update validation fixtures alongside implementation.
- Enabling preload sandbox may expose Electron/preload compatibility issues. Mitigation: treat sandbox enablement as preferred but allow a documented blocker plus security validation if the current bridge cannot move safely in this change.
- Replacing native dialogs touches sidebar, web panel, and terminal panel flows. Mitigation: keep the first implementation scoped to existing add/delete operations and reuse existing settings persistence paths.
- Archiving many changes at once can obscure unrelated spec drift. Mitigation: archive only changes with all tasks complete and run `openspec validate --all --strict` after archival.
