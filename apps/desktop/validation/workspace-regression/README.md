# Workspace Regression Validation

This validation flow covers the desktop renderer Workspace interactions that remain important as a secondary inspection surface:

- metadata query filtering
- bucket/query composition
- JSON preview loading
- separation between secondary inspection selection state and preview target
- log preview loading

## Prerequisites

1. Run renderer typecheck and refresh the deterministic renderer build:

```powershell
npm run typecheck -w @ai-workbench/desktop
npm run build -w @ai-workbench/desktop
npm run validate:renderer-entrypoint -w @ai-workbench/desktop
```

2. Run the regression validation:

```powershell
npm run validate:workspace-regression -w @ai-workbench/desktop
```

Or from the repo root:

```powershell
npm run validate:workspace-regression
```

The default entrypoint is the compiled renderer at `apps/desktop/out/renderer/index.html`. If you need to debug against a live renderer dev server, override it explicitly:

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL='http://localhost:5174'
npm run validate:workspace-regression
```

Unset the override to return to the deterministic build entrypoint:

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL=$null
npm run validate:workspace-regression
```

Run the full internal alpha sequence when the change crosses multiple validation areas:

```powershell
npm run validate:internal-alpha
```

## What It Uses

- `fixtures/workspace-snapshot.json`: deterministic workspace metadata fixture
- `fixtures/artifact-contents.json`: deterministic markdown/JSON/log preview payloads
- `run-workspace-regression.mjs`: validation runner that boots a Playwright CLI session
- `assert-workspace-flow.js`: explicit pass/fail interaction checks

## Notes

- The runner reserves `artifacts/` for local validation outputs, but the pass/fail contract of this workflow is the command exit status and explicit interaction assertions.
- This workflow protects Workspace as a secondary inspection surface; it is not a statement that Workspace should become the primary day-to-day conversation entrypoint.
