## 1. Replace modal thread interactions in Workspace

- [x] 1.1 Replace prompt- and confirm-driven thread controls with inline create, select, rename, and reassign interactions in the Workspace panel
- [x] 1.2 Update renderer state and i18n copy so thread-control drafts and action feedback work without modal browser dialogs

## 2. Preserve one continuity mutation surface

- [x] 2.1 Reuse the existing workspace thread IPC methods while formalizing thread-title editing as stable continuity behavior
- [x] 2.2 Keep managed web and CLI panels read-only for thread mutation and route all edits through Workspace

## 3. Validate inline continuity management

- [x] 3.1 Extend workspace regression coverage for inline thread creation, rename, activation, and scope reassignment flows
- [x] 3.2 Verify emitted workspace snapshots stay consistent after repeated thread edits and scope moves
