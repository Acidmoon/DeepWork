## Why

DeepWork already supports thread creation, selection, renaming, and scope reassignment at the workspace-manager layer, but the Workspace panel still drives key thread actions through browser-style `prompt` and `confirm` flows. For the internal alpha, that makes the continuity workflow feel like a debug surface instead of the primary control plane for ongoing work.

## What Changes

- Replace prompt- or confirm-driven thread interactions in Workspace with inline controls for creating, selecting, renaming, and reassigning thread membership.
- Formalize thread-title editing as part of the continuity contract instead of treating titles as create-time labels only.
- Keep Workspace as the single thread-management surface while managed web and CLI panels remain read-only consumers of thread state.
- Preserve existing inspection behavior for scopes and artifacts while removing modal thread-editing flows from the panel.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-workbench-panels`: add inline workspace controls for thread creation, activation, renaming, and scope reassignment.
- `context-thread-management`: add explicit thread-title editing behavior while preserving stable thread identity and existing scope membership.

## Impact

- Affected code: workspace panel renderer, renderer store state for thread interactions, related i18n strings, and any panel-specific draft state needed for inline editing.
- Affected systems: workspace snapshot synchronization, thread mutation flows already exposed through preload IPC, and thread-aware panel navigation conventions.
- Validation impact: workspace regression coverage must exercise inline thread creation, rename, and reassignment flows instead of relying on prompt stubs.
