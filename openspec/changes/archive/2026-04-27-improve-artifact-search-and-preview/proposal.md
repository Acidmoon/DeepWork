## Why

DeepWork already captures and indexes workspace artifacts, but the current workspace UI still behaves like a raw index dump: users can filter by bucket and origin, yet they cannot actually search the saved records or inspect a selected artifact in a dedicated preview flow. This makes the retrieval layer technically present but operationally weak at the exact point where the MVP needs to become usable.

This change is needed now because the baseline spec is in place and the next highest-value improvement is turning saved context into something a user can quickly find, inspect, and reuse without leaving the workspace panel.

## What Changes

- Add query-driven artifact discovery to the workspace panel using indexed metadata that is already available in renderer state.
- Improve session and artifact filtering so bucket, origin, and search query can work together instead of forcing users to browse short fixed lists.
- Add a dedicated artifact preview flow that lazy-loads the selected artifact content through the existing workspace read API.
- Preserve the current index-first retrieval model by keeping search metadata-driven and preview content on-demand.
- Keep prompt-building behavior intact while making artifact selection and inspection more practical for human review.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-context-management`: Extend the workspace panel contract to support query-driven discovery, richer filtered lists, and on-demand artifact preview for indexed artifacts.

## Impact

- Affects workspace-facing renderer behavior in `apps/desktop/src/renderer/src/panel-content.tsx`, `store.ts`, `types.ts`, and `i18n.ts`.
- Reuses the existing `workspace:read-artifact` IPC path and current workspace snapshot data model.
- Does not require changing artifact persistence formats or introducing new external dependencies.
