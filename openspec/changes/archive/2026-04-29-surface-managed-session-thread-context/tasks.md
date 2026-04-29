## 1. Extend managed panel continuity contracts

- [x] 1.1 Add session-linked continuity fields to shared terminal and web snapshot types together with the corresponding preload and renderer view-state contracts
- [x] 1.2 Update the main-process terminal and web panel managers to populate and emit stable continuity state for the current linked session

## 2. Surface continuity state in the renderer

- [x] 2.1 Render thread, context, and session-scope indicators inside managed web and CLI panels using the emitted snapshot state
- [x] 2.2 Add a workspace jump action that activates Workspace inspection for the linked `sessionScopeId` when a saved scope exists

## 3. Validate continuity visibility

- [x] 3.1 Extend targeted validation fixtures or assertions for managed panel continuity state and workspace jump behavior
- [x] 3.2 Verify that emitted panel continuity state stays aligned with transcript persistence and retrieval-audit identity
