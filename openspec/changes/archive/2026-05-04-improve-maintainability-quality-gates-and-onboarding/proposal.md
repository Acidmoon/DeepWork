## Why

DeepWork has strong focused validation, but the repository still lacks a lightweight lint/format quality gate, has duplicated desktop runtime initialization paths, and asks new contributors to read a long README before reaching the shortest safe startup path. Addressing these gaps improves day-to-day maintainability without changing product behavior.

## What Changes

- Add a repository-owned lint and/or format check that complements TypeScript typechecking and can be run from the root package scripts.
- Include the new quality gate in documented focused validation and appropriate release-readiness workflows.
- Refactor duplicated Electron startup and activation manager initialization into a shared main-process runtime initialization path.
- Preserve existing manager contracts, startup workspace resolution, settings synchronization, package smoke behavior, and validation entrypoints after the refactor.
- Add a concise quickstart path for first-time contributors or operators while keeping the existing README detail available.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `repo-configuration`: Repository configuration must include a repeatable static quality gate and concise onboarding/startup documentation.
- `desktop-module-boundaries`: Desktop main-process runtime initialization must use a shared orchestration boundary instead of duplicating manager setup across startup and activation paths.
- `desktop-regression-validation`: Validation documentation and release-readiness flows must include the new quality gate and protect the startup refactor from behavior drift.

## Impact

- Root and desktop `package.json` scripts.
- Optional lint/format configuration files at the repository root.
- Main-process startup orchestration in `apps/desktop/src/main/index.ts`.
- README and/or a focused quickstart document.
- Validation README and any release-readiness command sequence that should include the new quality gate.
