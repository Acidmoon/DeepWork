# Workspace Regression Validation

This validation flow covers the desktop renderer workspace interactions added in the search-and-preview work:

- metadata query filtering
- bucket/query composition
- JSON preview loading
- separation between artifact checkbox selection and preview target
- log preview loading

## Prerequisites

1. Start the desktop renderer dev server:

```powershell
npm run dev -w @ai-workbench/desktop
```

2. In another terminal, run renderer typecheck:

```powershell
npm run typecheck -w @ai-workbench/desktop
```

3. Run the regression validation:

```powershell
npm run validate:workspace-regression -w @ai-workbench/desktop
```

Or from the repo root:

```powershell
npm run validate:workspace-regression
```

## What It Uses

- `fixtures/workspace-snapshot.json`: deterministic workspace metadata fixture
- `fixtures/artifact-contents.json`: deterministic markdown/JSON/log preview payloads
- `run-workspace-regression.mjs`: validation runner that boots a Playwright CLI session
- `assert-workspace-flow.js`: explicit pass/fail interaction checks

## Notes

- The runner reserves `artifacts/` for local validation outputs, but the pass/fail contract of this workflow is the command exit status and explicit interaction assertions.
