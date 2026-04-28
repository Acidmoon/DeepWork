## Why

DeepWork already teaches managed CLI sessions to rank workspace scopes before reading artifacts, and the helper commands already emit retrieval audit logs in a low-level form. What is still missing is a first-class workspace record of those lookups, which makes it harder to verify whether automatic retrieval chose the right session, missed a relevant scope, or never completed a pending lookup cleanly.

## What Changes

- Promote managed CLI retrieval audit data from helper-level log output into a workspace-managed record that remains inspectable per CLI session.
- Persist structured retrieval evidence for selected-scope, no-match, and superseded lookup outcomes without requiring transcript parsing.
- Surface retrieval audit records through the existing workspace indexing model so operators can inspect automatic retrieval behavior from normal workspace flows.
- Tighten cleanup behavior around pending retrieval state so unfinished lookups do not leave ambiguous inspection results.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-workspace-awareness`: Strengthen the retrieval-outcome contract so managed CLI lookups produce stable, structured audit records for all supported outcomes.
- `workspace-context-management`: Extend workspace persistence and inspection behavior so retrieval audit records become first-class workspace artifacts or indexed records rather than untracked sidecar files.

## Impact

- Affected specs: `cli-workspace-awareness`, `workspace-context-management`
- Likely code areas: retrieval helper generation in `apps/desktop/src/main/workspace-manager.ts`, managed session bootstrap in `apps/desktop/src/main/terminal-manager.ts`, workspace artifact/index models in `packages/core/src/desktop/workspace.ts`, and renderer workspace inspection flows in `apps/desktop/src/renderer/src/panel-content.tsx`
- Validation impact: the retrieval validation path under `apps/desktop/validation/workspace-retrieval/` will likely need to assert the new workspace-managed audit behavior
