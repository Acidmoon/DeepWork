# Custom Web Panel Validation

This validation flow covers the renderer-facing custom webpage lifecycle introduced by the custom-web delivery change:

- add a custom webpage from the Web Apps section
- open the new panel immediately from navigation
- save edited home URL and partition values
- switch between persisted and ephemeral session modes
- disable and re-enable the panel without losing the saved definition
- rename and delete the user-defined panel

## Prerequisites

1. Run typecheck and refresh the deterministic renderer build:

```powershell
npm run typecheck -w @ai-workbench/desktop
npm run build -w @ai-workbench/desktop
npm run validate:renderer-entrypoint -w @ai-workbench/desktop
```

2. Run the validation:

```powershell
npm run validate:custom-web-panels -w @ai-workbench/desktop
```

Or from the repo root:

```powershell
npm run validate:custom-web-panels
```

The default entrypoint is the compiled renderer at `apps/desktop/out/renderer/index.html`. If you need to debug against a live renderer dev server, override it explicitly:

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL='http://localhost:5174'
npm run validate:custom-web-panels
```

## What It Uses

- `run-custom-web-panels-validation.mjs`: boots a Playwright CLI session against the deterministic renderer entrypoint
- `assert-custom-web-panels.js`: executes the custom webpage lifecycle assertions
- a stubbed `window.workbenchShell` injected before page load so the renderer can be exercised without a live Electron main process

## Notes

- This validation intentionally focuses on renderer-side custom panel state and settings synchronization, not remote website compatibility.
- The pass/fail contract is the command exit status plus explicit interaction assertions.
