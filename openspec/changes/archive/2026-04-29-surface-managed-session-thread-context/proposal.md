## Why

DeepWork already assigns stable thread and session-scope identity to managed CLI launches and workspace captures, but operators still have to infer that identity indirectly from Workspace browsing or logs. For the internal alpha, that makes continuity feel hidden even when the product is already preserving it correctly.

## What Changes

- Surface session-linked continuity metadata such as `threadId`, `threadTitle`, `contextLabel`, and `sessionScopeId` in managed terminal and web panel state.
- Show continuity badges or labels inside active managed panels so operators can tell whether the current surface is continuing prior work or operating as a fresh session.
- Add a direct workspace jump from managed panels to the corresponding saved scope so operators can inspect the artifacts backing the current session.
- Preserve current continuity semantics: changing the active thread affects future launches and captures, not an already running managed session.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-workbench-panels`: add visible session-linked continuity context and workspace jump behavior to managed web and CLI surfaces.
- `agent-session-handoff`: expose managed CLI session identity through emitted runtime snapshots in addition to bootstrap environment metadata.

## Impact

- Affected code: `packages/core/src/desktop/terminal-panels.ts`, `packages/core/src/desktop/web-panels.ts`, `packages/core/src/desktop/panels.ts`, preload IPC, and renderer panel/store code for web and terminal panels.
- Affected systems: main-process terminal and web panel managers, workspace-driven panel navigation, and continuity-related renderer state hydration.
- Validation impact: managed panel validation fixtures and thread-aware workspace inspection flows need coverage for visible continuity state and workspace jump behavior.
