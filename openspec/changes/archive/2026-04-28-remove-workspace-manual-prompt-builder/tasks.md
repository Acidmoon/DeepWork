## 1. Remove prompt-builder-specific state and helpers

- [x] 1.1 Remove `promptTargetPanelId` and `promptDraft` from the Workspace panel view-state contract and default snapshot in `packages/core/src/desktop/panels.ts`
- [x] 1.2 Delete the shared manual prompt builder implementation in `apps/desktop/src/shared/prompt-builder.ts` and remove any renderer imports or references to it

## 2. Simplify the Workspace panel interaction model

- [x] 2.1 Remove prompt-builder UI sections, actions, and terminal-target controls from `apps/desktop/src/renderer/src/panel-content.tsx`
- [x] 2.2 Keep workspace browsing, artifact selection, and artifact preview behavior functional after the prompt-builder removal

## 3. Align validation and supporting copy

- [x] 3.1 Update any renderer copy, labels, or tests that still describe Workspace as generating or sending manual CLI prompts
- [x] 3.2 Run the relevant regression or targeted verification flow to confirm Workspace browsing and preview still work without prompt-builder behavior
