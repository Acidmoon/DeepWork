## Context

DeepWork already persists thread-aware session identity in the main process. `WorkspaceManager` knows which thread a managed CLI or managed web capture belongs to, and `TerminalManager` already tracks per-session values such as `contextLabel`, `sessionScopeId`, `threadId`, and `threadTitle`. However, the snapshot types exported through `packages/core` do not expose that identity to the renderer, so the operator can only confirm continuity indirectly by opening the Workspace panel and matching scopes after the fact.

The missing visibility is now a UX gap rather than a storage gap. The system already makes continuity decisions, persists transcript and audit artifacts, and keeps thread indexes consistent. The next step is to surface that same identity at the panel edge without introducing a second continuity source of truth.

## Goals / Non-Goals

**Goals:**
- Expose session-linked continuity context directly in managed terminal and web panel snapshots.
- Make panel-visible continuity state stable for the lifetime of a running or linked session.
- Let operators jump from a managed panel into the corresponding Workspace scope without manually searching for it.

**Non-Goals:**
- Changing how active-thread selection is stored or how thread assignment is decided for future captures.
- Adding thread mutation controls directly to web or terminal panels.
- Reassigning running sessions to a different thread after they have already started.

## Decisions

### Extend snapshot contracts instead of deriving panel context from global workspace state
Terminal and web managers already know the exact launch-linked or capture-linked session identity. The renderer should receive that data through `TerminalPanelSnapshot` and `WebPanelSnapshot` rather than trying to infer it from `WorkspaceSnapshot.activeThreadId`, which may change after the session begins.

Alternative considered: derive all continuity badges from the current workspace snapshot alone. Rejected because a running session can legitimately remain attached to an older thread while the operator has already selected another active thread for future work.

### Treat session-linked continuity state as immutable for the current session lifetime
Once a managed CLI session starts, or once a managed web panel is linked to a saved scope, the emitted session identity remains stable until the session ends or a later capture creates a new linked scope. This preserves the existing continuity contract that active-thread changes only affect future launches and captures.

Alternative considered: automatically update a live panel's displayed thread whenever the operator switches the active thread. Rejected because it would misrepresent where current transcript or capture writes are actually going.

### Route Workspace jumps through scope identity, not raw file paths
The panel action should navigate to the Workspace surface using `sessionScopeId` and existing workspace snapshot data. This keeps panel-to-workspace navigation aligned with the current continuity model and avoids turning panel actions into filesystem shortcuts.

Alternative considered: jump to a specific artifact or expose filesystem paths directly from the panel action. Rejected because the operator usually wants to inspect the whole saved session scope, not one arbitrary file.

### Keep web-panel continuity state scoped to linked captures
Managed web panels can show linked thread identity immediately when the panel already has a continuity target, but the session-scope jump action is only actionable once a saved scope exists. The UI should therefore distinguish between "linked thread" and "saved scope available" rather than inventing synthetic scope identities before capture.

Alternative considered: manufacture a synthetic scope ID for live web panels before any capture occurs. Rejected because it would create UI-visible identities that do not yet exist in workspace-managed records.

## Risks / Trade-offs

- [Snapshot drift between panel state and workspace indexes] -> Mitigation: use the same session-linked values already produced by the main-process managers, and validate workspace jump behavior against emitted snapshots.
- [Operator confusion between active thread and session-linked thread] -> Mitigation: label panel continuity state as the current session's linked context, not as the globally active thread.
- [Web panels may not always have an immediately openable saved scope] -> Mitigation: keep the thread badge visible while disabling or hiding the workspace jump until a scope-backed identity exists.

## Migration Plan

- Add the new continuity fields to shared panel snapshot types and keep them optional until all producers populate them.
- Update terminal and web managers to emit the linked continuity state without changing how workspace persistence works.
- Update renderer stores and panel UIs to consume the new fields and expose the workspace jump action when `sessionScopeId` is present.
- Extend validation fixtures so the new fields are exercised before rollout is treated as complete.
