## Context

The repository already ships focused validation flows with deterministic fixture data and runtime stubs, but the browser-driven ones still expect a developer to separately start a renderer dev server and keep `http://localhost:5173` reachable. That dependency is fragile in constrained environments and undermines the reproducibility that the validation suite is intended to provide.

The retrieval-helper validation already demonstrates the desired direction: a direct scripted workflow that does not require a live GUI session. The browser-driven flows should keep their current assertion model and stubs while switching to a deterministic renderer entrypoint owned by the repository.

## Goals / Non-Goals

**Goals:**
- Remove the default dependency on a live localhost dev server for browser-driven validation flows.
- Keep fixture-driven runtime stubs and existing browser assertions intact.
- Provide one documented internal-alpha regression workflow for the focused validation set.

**Non-Goals:**
- Replacing the focused validation strategy with full Electron end-to-end tests.
- Removing the explicit URL override used for targeted debugging.
- Redesigning the underlying validation scenarios or fixture content beyond entrypoint resolution.

## Decisions

### Introduce a repo-managed renderer validation entrypoint
Browser-driven validation flows should prepare or resolve a shared renderer entrypoint from repo-owned assets before launching assertions. The default documented path becomes this deterministic entrypoint, while `AI_WORKBENCH_VALIDATION_RENDERER_URL` remains available for debugging overrides.

Alternative considered: keep localhost as the default path and only document troubleshooting. Rejected because it leaves the primary validation workflow dependent on ambient operator setup.

### Preserve the existing stubbed-runtime validation model
The current validation scripts already inject deterministic workspace snapshots and runtime stubs. Those mechanisms stay in place; only the renderer page loading path changes.

Alternative considered: move immediately to full Electron-backed validation. Rejected because it would substantially broaden the test strategy and reintroduce runtime flakiness that the current focused flows avoid.

### Fail fast with actionable entrypoint errors
Validation scripts should report whether the deterministic entrypoint is missing, stale, or overridden incorrectly. Clear failure modes are part of the workflow contract once localhost is no longer assumed.

Alternative considered: allow deeper browser-side failures to surface indirectly. Rejected because entrypoint resolution issues are easier to diagnose when called out explicitly.

### Define one internal-alpha regression sequence
The repo should document and, where practical, script the exact validation order: typecheck first, retrieval-helper validation next, then the browser-driven validation flows against the deterministic renderer entrypoint.

Alternative considered: leave validation ordering implicit in scattered README notes. Rejected because the alpha gate needs one stable checklist.

## Risks / Trade-offs

- [A dedicated validation entrypoint adds one more build or preparation step] -> Mitigation: keep the step scripted and shared by all browser-driven validation flows.
- [The validation entrypoint could drift from the product renderer if maintained separately] -> Mitigation: derive it from repo-owned renderer assets instead of maintaining a parallel test-only UI.
- [Cross-platform path or quoting issues may appear in browser-driven scripts] -> Mitigation: centralize entrypoint resolution and validate it through the documented workflow.

## Migration Plan

- Add a shared renderer validation entrypoint preparation or resolution step that can be reused across browser-driven flows.
- Update focused validation scripts to use the shared entrypoint by default while preserving explicit override support.
- Refresh validation documentation and package scripts to describe the internal-alpha regression sequence.
- Re-run the focused validation set against the deterministic entrypoint before treating the change as complete.
