## Context

The desktop app now has two files that mix enough unrelated responsibilities to make routine changes riskier than they need to be:

- `apps/desktop/src/renderer/src/panel-content.tsx` renders every panel kind, hosts terminal lifecycle wiring, hosts web-panel embedding logic, and also owns workspace search, session summarization, preview parsing, and display-formatting helpers.
- `apps/desktop/src/main/workspace-manager.ts` combines workspace bootstrap content, PowerShell helper text, clipboard content detection, artifact persistence, retrieval-audit synchronization, snapshot assembly, and context-index/origin-manifest rewriting inside one class file.

Both files sit on validation-sensitive paths. The renderer file affects panel rendering and workspace browsing behavior. The main-process file affects persisted artifacts, scope metadata, and workspace snapshots that existing retrieval and regression validations already depend on. The refactor therefore needs to create clearer module ownership without changing the current user-visible desktop behavior or workspace data contracts.

## Goals / Non-Goals

**Goals:**

- Split `panel-content.tsx` into focused renderer modules organized by panel/domain responsibility rather than one monolithic component file.
- Split `workspace-manager.ts` into focused main-process modules while preserving `WorkspaceManager` as the main public orchestration entrypoint.
- Keep existing panel rendering behavior, workspace snapshot shapes, artifact/index formats, and preload/API contracts stable during the refactor.
- Make the resulting module boundaries explicit enough that later feature work can change one desktop concern without reopening unrelated files.
- Validate the structural refactor through the existing desktop typecheck and relevant validation commands.

**Non-Goals:**

- Redesign the workspace UI, panel toolbar behavior, or workspace artifact schemas.
- Introduce new IPC channels, rename public manager methods, or change existing settings/workspace payload shapes.
- Move this refactor into `packages/core`; this change is about app-local module boundaries, not another package extraction.
- Add a brand-new general-purpose test framework as part of the split.

## Decisions

### 1. Keep stable facade entrypoints and move internals behind them

`PanelContent` and `WorkspaceManager` should remain the stable top-level exports consumed by the rest of the app. The refactor should move internals into sibling modules while keeping these entrypoints as the import boundary for existing callers.

For the renderer, `panel-content.tsx` should shrink into a thin dispatcher that routes by panel kind and delegates to extracted modules. For the main process, `workspace-manager.ts` should keep the `WorkspaceManager` class and public methods, but delegate implementation details to helper modules.

This avoids widening the change into a repo-wide rename and keeps the behavioral diff reviewable.

Alternative considered: rename the entrypoints and force callers to adopt the new file layout immediately. Rejected because it adds import churn without improving the runtime behavior or ownership boundary.

### 2. Split renderer code by panel/domain slice, not by arbitrary line count

The renderer split should follow responsibility boundaries:

- dedicated panel components for `home`, `web`, `terminal`, `workspace`, `tool`, and `settings`
- a workspace-focused sub-area for search/filter helpers, session summary/presentation helpers, and preview hydration/parsing helpers
- small shared DOM helpers only where they are used across multiple panel modules

The workspace panel is the dominant hotspot inside `panel-content.tsx`, so it should not remain a giant extracted sibling file that still contains summary, search, and preview parsing helpers inline. Those helpers should move into adjacent workspace-focused modules so workspace browsing behavior becomes easier to test and change in isolation.

Alternative considered: split the file only into one component per panel and leave all workspace helper functions bundled together inside the extracted workspace panel component. Rejected because it only moves the hotspot instead of reducing coupling inside it.

### 3. Keep `WorkspaceManager` stateful orchestration in the class and extract deterministic helper modules around it

`WorkspaceManager` still needs to own mutable workspace-root state, last-saved/error tracking, and snapshot emission. The split should therefore preserve the class as the orchestrator and extract the surrounding deterministic helpers into modules such as:

- managed workspace/rules document content
- clipboard payload detection and markdown/html classification
- artifact persistence and manifest mutation helpers
- retrieval-audit artifact synchronization helpers
- context-index/origin-manifest writing helpers
- snapshot assembly from current manifest/index state

This creates a cleaner separation between stateful orchestration and deterministic workspace logic without forcing a full service rewrite.

Alternative considered: replace `WorkspaceManager` with several new service classes and re-compose them through dependency injection. Rejected because it adds a second architectural axis and is unnecessary for this bounded refactor.

### 4. Preserve contract shapes first, then optimize internal ownership

This refactor should explicitly preserve:

- public `WorkspaceManager` method signatures
- `WorkspaceSnapshot`, `ArtifactContentPayload`, and related persisted manifest/index formats
- current renderer-side panel view-state usage
- current preload call sites and validation command entrypoints

The change should be reviewed as structural movement plus local cleanup, not as a contract redesign. If a helper appears to want a new data shape, the default choice for this change is to adapt inside the extracted module rather than widening the public interface.

Alternative considered: opportunistically redesign workspace manager payloads while splitting files. Rejected because it would make regressions harder to isolate and turn a refactor into a behavior change.

### 5. Reuse the existing validation flows as refactor guardrails

The change should validate against existing commands rather than inventing a new stack. At minimum, the implementation should expect to run:

- desktop typecheck
- workspace retrieval validation
- workspace regression validation
- any targeted panel validation affected by extracted renderer logic

This keeps the refactor tied to already-maintained user-facing behavior checks.

Alternative considered: add a new one-off refactor smoke test suite. Rejected because the current project already has focused validation flows, and duplicating them would add maintenance cost without increasing behavioral confidence proportionally.

## Risks / Trade-offs

- [The facade files stay thin but the extracted modules become another dumping ground] -> Mitigation: extract by named responsibility with small, adjacent modules instead of one catch-all `helpers.ts`.
- [Workspace renderer logic grows circular dependencies between summaries, preview parsing, and panel state updates] -> Mitigation: keep data-formatting helpers pure and let only the panel component or hook own store mutation and async preview hydration.
- [Workspace manager extraction accidentally changes artifact/index write ordering] -> Mitigation: preserve current public method flow and validate with existing retrieval and workspace regression commands.
- [The refactor quietly changes presentation copy or fallback behavior while moving JSX] -> Mitigation: treat the split as structure-first, preserve rendered behavior, and avoid combining the extraction with UI redesign.
- [Review complexity stays high if extraction and behavior fixes are mixed] -> Mitigation: keep this change scoped to module boundaries and contract preservation; defer unrelated behavior work to follow-up changes.

## Migration Plan

1. Define the target renderer and main-process module layout while preserving `PanelContent` and `WorkspaceManager` as stable entrypoints.
2. Extract renderer panel modules first, with the workspace panel split further into focused helper modules for search, summaries, and preview hydration/parsing.
3. Extract workspace-manager helper modules next, starting with content/constants and deterministic helpers before moving persistence/indexing routines.
4. Trim the facade files so they delegate rather than re-implement the extracted responsibilities.
5. Run desktop typecheck plus the relevant workspace/panel validation flows to confirm behavior and persisted data contracts remain unchanged.

Rollback is straightforward because this change does not migrate persisted data or public API shapes: revert the import wiring and re-inline the extracted modules if the refactor destabilizes behavior.

## Open Questions

- Should any workspace search/summary helpers extracted from the renderer later move into `@ai-workbench/core`, or should they remain renderer-local because they depend on presentation formatting and locale-aware copy?
- For `workspace-manager.ts`, is it cleaner to extract pure helper functions only, or should some extracted slices become small local modules with their own narrow interfaces around filesystem writes?
