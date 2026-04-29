## Context

The current Workspace panel already exposes thread summaries and thread mutation actions, but the operator experience is still partly modal: new thread titles and rename flows use `window.prompt`, while destructive or mutation-adjacent actions rely on confirm dialogs. The underlying main-process APIs are already available through preload, so the remaining gap is mostly in renderer interaction design and in making thread-title editing a first-class continuity behavior.

This change should keep Workspace as the single place that mutates thread membership. Managed terminal and web panels will surface context, but they should not introduce competing mutation controls while continuity rules are still stabilizing.

## Goals / Non-Goals

**Goals:**
- Replace modal prompt-driven thread actions with inline Workspace controls.
- Make thread-title editing an explicit, stable part of the continuity contract.
- Preserve one source of truth for thread mutation by routing all edits through Workspace.

**Non-Goals:**
- Redesigning artifact browsing or preview behavior outside the thread-control surfaces.
- Introducing drag-and-drop thread reassignment or bulk thread operations.
- Adding thread mutation controls directly to terminal or web panels.

## Decisions

### Reuse existing workspace IPC methods instead of adding a second thread-mutation API
The main-process layer already exposes `createThread`, `selectThread`, `renameThread`, and `reassignScopeThread`. The renderer will switch to inline controls while preserving those existing mutation entrypoints and emitted workspace snapshots.

Alternative considered: add a new consolidated `saveThreadMutation` API. Rejected because it would duplicate already working behavior without improving the continuity contract.

### Keep inline draft state local to the Workspace interaction surface
Create and rename drafts are transient interaction state, not durable workspace state. They should stay local to the Workspace panel or its view-state wrapper rather than becoming persisted cross-panel settings.

Alternative considered: persist draft text in workspace snapshots or global settings. Rejected because it would leak incomplete operator input into unrelated panel hydration flows.

### Treat thread renaming as a metadata edit that does not change thread identity
Renaming a thread must update visible titles without changing `threadId`, scope membership, or artifact association. This aligns the UI contract with the existing index model and avoids introducing migration work for old artifacts.

Alternative considered: regenerate thread IDs when titles change. Rejected because it would break stable references from scopes, helper commands, and validation fixtures.

### Keep scope reassignment as an explicit apply action
Thread reassignment should remain a deliberate select-and-apply workflow inside Workspace rather than becoming implicit through panel switches or drag-and-drop behavior. This keeps mutation intent clear while the alpha workflow is still stabilizing.

Alternative considered: auto-reassign the selected scope when the operator changes active thread. Rejected because it would couple "future continuity target" with "historical scope membership" and create easy mistakes.

## Risks / Trade-offs

- [Inline controls can increase renderer-state complexity] -> Mitigation: keep draft state local and reuse existing main-process mutations instead of adding new persistence layers.
- [Operators may expect terminal or web panels to mutate threads once context becomes visible there] -> Mitigation: make Workspace the only editable continuity surface and use panel jump actions to route edits back there.
- [Frequent thread edits could expose snapshot sync bugs] -> Mitigation: add workspace regression coverage for repeated create, rename, select, and reassign flows.

## Migration Plan

- Replace prompt-driven Workspace thread interactions with inline controls and local draft state.
- Reuse current preload IPC calls and emitted workspace snapshots so the mutation backend stays stable.
- Extend continuity specs to cover editable thread titles and non-modal Workspace controls before implementation is considered complete.
- Refresh regression fixtures and assertions to target inline controls rather than prompt stubs.
