## 1. Thread Data Model And Persistence

- [x] 1.1 Extend the desktop core/workspace models to represent thread indexes, per-thread manifests, and artifact-level thread metadata without removing current scope IDs.
- [x] 1.2 Update workspace rebuild logic to backfill thread records for existing artifacts/scopes and persist thread manifests together with artifact and scope indexes.
- [x] 1.3 Add main/preload workspace operations for creating threads, selecting/continuing a thread, renaming a thread if supported, and reassigning a saved scope into a target thread.

## 2. Thread-Aware Capture And Session Flows

- [x] 2.1 Track active thread assignment through manual clipboard saves, managed web capture, and terminal transcript persistence so new artifacts can land in a shared thread.
- [x] 2.2 Extend managed terminal bootstrap to carry thread identity into the session environment and keep later launches linked to the same long-lived thread when the user continues it.
- [x] 2.3 Update managed CLI retrieval and retrieval-audit persistence so current-thread lookup is attempted before global scope ranking and the chosen path remains inspectable.

## 3. Renderer Continuity Surfaces

- [x] 3.1 Add workspace thread browsing, create/continue actions, and scope-to-thread reassignment flows in the renderer.
- [x] 3.2 Expose current-thread state and continue/new-thread controls in the relevant web and terminal workbench surfaces.
- [x] 3.3 Update renderer store hydration and snapshot synchronization so thread state stays consistent with workspace snapshots and panel runtime updates.

## 4. Validation And Regression Coverage

- [x] 4.1 Add or extend validation flows for thread creation, thread continuation across web/CLI/manual captures, and conservative migration of existing workspace content.
- [x] 4.2 Re-run desktop typecheck plus the affected workspace, retrieval, and custom-panel validation commands after the implementation lands.
