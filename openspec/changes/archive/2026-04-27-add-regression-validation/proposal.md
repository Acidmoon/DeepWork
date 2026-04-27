## Why

The workspace search and artifact preview flow now carries real product value, but its validation still depends on ad hoc manual checks and temporary local scripts. This should be tightened now while the feature is still fresh, before subsequent renderer changes make regressions harder to detect or reproduce.

## What Changes

- Add a repeatable regression-validation path for the desktop renderer's workspace search, filter, selection, and preview behavior.
- Define a stable set of validation fixtures that covers markdown, JSON, and log artifacts without depending on live Electron session state.
- Add a documented validation workflow that combines renderer typechecking with browser-driven verification of key workspace interactions.
- Keep the validation scope narrow to the workspace retrieval surface introduced in the previous change.

## Capabilities

### New Capabilities
- `desktop-regression-validation`: Defines repeatable regression validation assets and workflows for critical desktop renderer interactions.

### Modified Capabilities
- `workspace-context-management`: Clarify that the workspace search and preview workflow is backed by repeatable validation coverage for its critical interaction path.

## Impact

- Affects desktop renderer validation assets, likely under `output/playwright/`, plus any small helper scripts or docs needed to run them repeatedly.
- May add lightweight fixtures or mock workspace payloads for renderer-level verification.
- Reuses the existing `typecheck` workflow and current Playwright CLI-based browser validation approach.
