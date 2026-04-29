## Context

The repository already has a `desktop-core-domain` contract, and several earlier refactors moved shared types and pure normalization into `packages/core`. Even so, the latest continuity work left a new cluster of runtime-independent business logic inside `apps/desktop`, especially around implicit thread continuation, scope-to-thread reuse rules, and the managed workspace protocol/instruction templates that describe how retrieval should behave.

`WorkspaceManager` is still the correct place for filesystem orchestration, manifest writes, and snapshot emission, but it now mixes those side effects with more pure policy decisions. This proposal isolates the next extraction slice so the core package grows around one coherent domain instead of continuing with ad hoc type-only exports.

## Goals / Non-Goals

**Goals:**
- Move runtime-independent workspace continuity planning into `packages/core`.
- Move managed workspace protocol/instruction template ownership into `packages/core` while keeping file persistence in `apps/desktop`.
- Preserve the current public `WorkspaceManager` and desktop-shell contracts during the extraction.
- Keep the extracted slice validation-backed so the refactor does not silently change continuity behavior.

**Non-Goals:**
- Moving filesystem, Electron, clipboard, PTY, or browser-view side effects into `packages/core`.
- Replacing `WorkspaceManager` with a new public API.
- Refactoring unrelated renderer modules or panel UI as part of this change.
- Reworking retrieval ranking behavior itself beyond what is needed to preserve current semantics after extraction.

## Decisions

### 1. Introduce explicit core modules for workspace continuity and managed workspace content

The extraction should add dedicated desktop-core modules rather than hiding more logic inside existing broad files such as `workspace.ts`. One module should own continuity planning rules; another should own the content templates/constants used to generate workspace protocol and managed agent instruction files.

Why:
- It keeps the new ownership boundary visible.
- It prevents `workspace.ts` from becoming another monolith.

Alternative considered:
- Extending `workspace.ts` with unrelated policy and template exports was rejected because it would blur the domain split the refactor is trying to improve.

### 2. Keep `WorkspaceManager` as the side-effect adapter and orchestration facade

The manager should continue reading manifests, writing files, updating indexes, and emitting snapshots. Core extraction should happen by introducing pure planners/builders that the manager calls after it has loaded runtime state and before it performs writes.

Why:
- The current public desktop API already flows through `WorkspaceManager`.
- This keeps the refactor incremental and avoids a wide caller migration.

Alternative considered:
- Moving the whole manager into core was rejected because it would drag filesystem and Electron coupling into the shared package.

### 3. Extract decision rules as data planners, not hidden helper callbacks

The continuity slice should expose plain-data inputs and outputs, such as “existing scope already belongs to thread X” or “new implicit scope requires a fresh thread seed,” instead of exporting callbacks that still reach back into desktop-only state.

Why:
- Plain-data planners are easier to validate and reuse.
- The boundary stays testable without mocking Node or Electron.

Alternative considered:
- Exporting desktop-shaped helper callbacks from core was rejected because it would preserve the same coupling behind a thinner wrapper.

## Risks / Trade-offs

- [Boundary becomes too abstract to be useful] → Keep the extracted scope narrow and tied to the current continuity rules and instruction templates, not a generic framework.
- [Desktop manager code becomes more indirect] → Use explicit planner/build-result naming so the orchestration flow remains readable.
- [Refactor drifts behavior without obvious failures] → Require typecheck and the relevant workspace/retrieval validations to pass after extraction.
- [Future contributors add new continuity logic back into `apps/desktop`] → Update the module-boundary spec so the architectural expectation is explicit.

## Migration Plan

No data migration is required. The rollout is a structural code extraction:
1. Add core modules and exports for continuity planning and managed workspace content templates.
2. Rewire desktop managers/helpers to call those core modules.
3. Re-run typecheck and existing validation flows.

If the refactor needs to be rolled back, the desktop shell can temporarily inline the pure logic again without changing persisted manifests or user settings.

## Open Questions

- None for the proposal scope. If the extraction later reveals a second coherent domain slice, that should be proposed separately rather than folded into this change.
