## Why

Workspace and Logs already let operators inspect saved session summaries and messages, but once a session row is selected there is no direct way to clear that selection from the same surface. That makes a secondary inspection flow feel sticky and forces users into indirect filter resets for a basic reversal action.

## What Changes

- Allow clicking an already-selected session row in Workspace or Logs to clear the local session selection and return to the current thread-filtered "all sources" view.
- Keep deselection scoped to local inspection state so it does not rewrite continuity metadata, preview targets, or artifact multi-selection.
- Add focused regression coverage for repeated session-row clicks in both artifact and log inspection paths.

## Capabilities

### New Capabilities

### Modified Capabilities
- `workspace-context-management`: Workspace inspection SHALL support clearing a selected session from the same list interaction that selected it.
- `desktop-regression-validation`: Workspace regression validation SHALL verify repeat-click deselection across artifact and log inspection flows.

## Impact

- Affects the renderer Workspace panel selection handler for session rows in both the Workspace and Logs surfaces.
- Affects workspace regression assertions covering session selection semantics.
- No main-process, manifest, or dependency changes are required.
