## Why

Recent thread-continuity and retrieval-preference work made the behavior more complete, but the deterministic rules still live mostly inside `apps/desktop` main-process modules. The next structural step is to move that runtime-independent domain logic into `packages/core` before more continuity features accumulate around the current adapters.

## What Changes

- Extract workspace-continuity domain rules from `apps/desktop` into new `packages/core` desktop modules.
- Extract managed workspace protocol/instruction template ownership from desktop-only modules into `packages/core`, while keeping file writes in the desktop shell.
- Keep `WorkspaceManager` and related desktop managers as orchestration/adaptor facades over filesystem, Electron, and PTY side effects.
- Update the desktop module-boundary contract so future refactors keep pure continuity logic in core instead of growing `apps/desktop` again.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `desktop-core-domain`: expand core ownership to cover workspace continuity planning and managed workspace content templates.
- `desktop-module-boundaries`: require the desktop workspace facade to compose extracted core-domain continuity modules while keeping runtime side effects in `apps/desktop`.

## Impact

- Affected code: `packages/core/src/desktop/*` exports, `apps/desktop/src/main/workspace-manager.ts`, `apps/desktop/src/main/workspace-manager/managed-workspace-content.ts`, and any helpers that currently embed continuity-specific rules.
- Affected systems: desktop main-process workspace orchestration, generated workspace instruction content, and validation coverage for structural refactors.
- Dependencies: no new external packages; this is a module-boundary and ownership refactor.
