## Why

Workspace now stores manifests, thread indexes, origin manifests, retrieval audits, and artifact files. As that data grows, users and developers need explicit maintenance tools to inspect index health, rebuild derived state, and repair safe inconsistencies without manually editing JSON files.

## What Changes

- Add explicit workspace maintenance operations for integrity scan, index rebuild, and safe repair.
- Surface maintenance results in Workspace as audit/debugging output rather than routine workflow controls.
- Expose helper-command support for developers or CLI agents that need structured maintenance diagnostics.
- Add validation fixtures for stale manifests, missing files, orphaned records, and unsafe paths.

## Capabilities

### New Capabilities

### Modified Capabilities
- `workspace-context-management`: Workspace SHALL provide explicit maintenance operations for scan, rebuild, and safe repair.
- `desktop-workbench-panels`: Workspace SHALL expose maintenance tools as secondary repair controls.
- `desktop-regression-validation`: Focused validation SHALL cover workspace maintenance diagnostics and repair behavior.

## Impact

- Affects WorkspaceManager operations, preload workspace API, renderer Workspace repair UI, managed helper scripts, and validation fixtures.
- No raw artifact deletion should occur unless the user invokes an explicit destructive action already covered by existing scope deletion behavior.
- Maintenance operations must honor existing workspace path confinement.
