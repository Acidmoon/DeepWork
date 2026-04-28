## Context

The project already has deterministic validation assets for renderer-side workspace search and preview, plus a separate PowerShell validation flow for workspace retrieval helpers and retrieval-audit persistence. The recent web-capture fix introduced a new critical path that crosses main process, preload IPC, renderer state, and workspace persistence: a web conversation changes, Workspace Sync triggers a real rescan, and the saved context becomes visible in workspace-managed records.

That path is more integration-heavy than the existing renderer-only workspace regression flow, so it needs an explicit validation strategy before more desktop changes land. The design should favor deterministic inputs and repo-owned fixtures over live third-party websites, while still exercising the same capture and resync code paths that production uses.

## Goals / Non-Goals

**Goals:**
- Add a repeatable regression-validation path for managed web capture and Workspace Sync.
- Verify that a manual workspace resync performs a real capture/persist cycle rather than a renderer-only status refresh.
- Keep validation deterministic enough to run in development without relying on a live external chat product.
- Reuse existing validation conventions under `apps/desktop/validation/` where possible.

**Non-Goals:**
- End-to-end compatibility coverage for every third-party chat provider.
- Broad UI snapshot testing across the full desktop shell.
- Reworking the production capture architecture solely for test convenience.

## Decisions

### Decision: Validate through a deterministic local harness rather than a live remote site

The validation should drive a locally controlled web surface or mocked content source that produces conversation-like DOM content. This keeps the test stable, avoids provider-side markup drift, and still exercises the scrape, capture, workspace persistence, and snapshot refresh path.

Alternative considered:
- Validate against a real hosted chat app. Rejected because it would be flaky, credential-sensitive, and too dependent on third-party DOM changes.

### Decision: Exercise the real `workspace:resync` path

The validation should explicitly invoke the same resync entry used by the renderer so it can catch regressions where Workspace Sync stops triggering main-process capture. The test should assert workspace snapshot changes, not just button wiring or local store updates.

Alternative considered:
- Assert only that the renderer calls a mocked method. Rejected because it would miss the exact integration bug that was just fixed.

### Decision: Assert persisted workspace effects, not only transient web-panel state

Success should be measured by the resulting workspace snapshot and persisted artifact metadata becoming inspectable through normal workspace flows. This matches the product goal: later retrieval depends on saved workspace records, not on a temporary in-memory capture state.

Alternative considered:
- Assert only that `captureCurrentContext()` runs or that a web panel emits a local event. Rejected because that would not guarantee persistence.

### Decision: Keep the new flow adjacent to existing desktop validation assets

The new validation should live under `apps/desktop/validation/` with focused documentation and prechecks, rather than becoming an ad hoc one-off script outside the established validation layout.

Alternative considered:
- Fold the flow into an unrelated existing validation script with many extra assertions. Rejected because it would make failures harder to localize and maintenance harder.

## Risks / Trade-offs

- [Integration harness drifts from production behavior] → Reuse the real resync IPC and workspace persistence path, and keep any mocked surface limited to page content generation.
- [Validation becomes flaky due to async capture timing] → Use deterministic waits tied to snapshot/artifact conditions instead of fixed sleeps wherever possible.
- [Coverage stays too narrow] → Document the exact guarantees: managed web capture, manual workspace resync, and persisted workspace visibility, not every provider-specific selector edge case.
- [Validation setup becomes heavy] → Prefer the smallest fixture set and reuse existing validation utilities and repo-owned workspace fixtures where practical.
