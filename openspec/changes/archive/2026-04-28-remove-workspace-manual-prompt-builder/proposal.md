## Why

DeepWork already positions managed CLI sessions as workspace-aware by default, but the Workspace panel still exposes a manual prompt builder that asks the operator to package selected artifacts and push a handcrafted prompt into a terminal. That flow conflicts with the intended product model of natural-language-first interaction and keeps a deprecated manual handoff path in the main workspace experience.

## What Changes

- Remove the Workspace panel's manual prompt builder UI, including prompt target selection, prompt draft editing, and the send-to-CLI action.
- **BREAKING** Remove renderer and shared state that exists only to support manual prompt packaging from selected artifacts.
- Reframe Workspace artifact selection and preview as inspection and debugging tools rather than a prerequisite for talking to CLI agents.
- Tighten the managed CLI contract so manual workspace inspection can remain available, but renderer-driven prompt packaging is no longer part of the supported workflow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-context-management`: Remove prompt-builder-specific Workspace behavior and clarify that artifact browsing remains optional human inspection, not manual CLI handoff preparation.
- `agent-session-handoff`: Strengthen the natural-language-first session contract so manual prompt packaging is explicitly excluded from supported managed CLI interaction.

## Impact

- Affected specs: `workspace-context-management`, `agent-session-handoff`
- Likely code areas: Workspace panel renderer in `apps/desktop/src/renderer/src/panel-content.tsx`, prompt-builder helper code in `apps/desktop/src/shared/prompt-builder.ts`, and Workspace panel view state in `packages/core/src/desktop/panels.ts`
- User-facing behavior: users continue to inspect saved scopes and artifacts in Workspace, but they no longer generate or send a manual handoff prompt from that panel
