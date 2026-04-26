## Context

The repository does not yet have a formal end-to-end test harness for the desktop app. The most credible validation path currently available is a combination of renderer typechecking plus browser-driven checks against the renderer dev server with a mocked `workbenchShell` surface. That approach already proved useful in the previous change: it caught a real `WorkspacePanel` update-loop bug and verified the search/filter/preview flow without depending on a live Electron window staying on the right panel.

## Goals / Non-Goals

**Goals:**
- Capture the workspace regression checks in repo-owned files instead of one-off terminal snippets.
- Cover the highest-value interactions: metadata search, combined bucket/origin/query filtering, preview loading, and separation between artifact selection and preview target.
- Keep the validation runnable with the current toolchain and repo structure.
- Make the validation easy to rerun after future renderer changes.

**Non-Goals:**
- Introduce a full Playwright test runner, CI pipeline, or new test framework in this change.
- Validate every panel in the desktop app.
- Replace manual product review for all Electron behaviors.
- Test binary artifact rendering or non-workspace panel flows.

## Decisions

### 1. Use renderer-dev validation instead of live Electron UI automation

The regression path will validate the renderer dev page with a mocked `workbenchShell` payload rather than automate the live Electron window directly.

Alternative considered: drive the live Electron shell for every regression run. Rejected because it is more brittle, depends on window focus/state, and makes deterministic validation of the workspace panel harder.

### 2. Store deterministic workspace fixtures in repo-owned validation assets

The validation flow should use a small, explicit fixture set for markdown, JSON, and log artifacts rather than reading arbitrary local workspace data.

Alternative considered: read the operator's current `Documents/AI-Workspace` state during every run. Rejected because it makes validation environment-specific and non-repeatable.

### 3. Keep the regression workflow scriptable and narrow

This change will focus on one stable validation flow that can be rerun locally: load fixtures, open the Artifacts panel, verify query filtering, verify preview rendering, verify selection/preview separation, and verify log filtering.

Alternative considered: create many fine-grained validation scripts immediately. Rejected because the repo does not yet have enough test infrastructure to justify broad expansion.

## Risks / Trade-offs

- [Validation still runs outside a formal test runner] → Mitigation: keep the flow deterministic and repo-owned, with explicit pass/fail assertions.
- [Mocked preload data may drift from the main-process contract] → Mitigation: mirror the current `WorkspaceSnapshot` and `readArtifact()` shape closely and keep fixtures small.
- [The workflow may not catch Electron-shell-only issues] → Mitigation: keep `typecheck` and targeted manual checks available for shell-specific regressions.
- [Playwright CLI ergonomics are less polished than a full framework] → Mitigation: keep scripts simple and document the exact invocation path.
