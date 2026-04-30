# Terminal Panel Configuration Validation

This validation flow covers the terminal-panel configuration lifecycle introduced by the terminal configuration change:

- edit a built-in CLI panel's supported overrides from the terminal details drawer
- persist those overrides through the settings sync path
- confirm a running PTY session stays stable after save
- explicitly restart to apply the updated launch configuration
- edit a custom CLI panel's shell, shell arguments, working directory, and startup command

## Prerequisites

1. Run typecheck and refresh the deterministic renderer build:

```powershell
npm run typecheck -w @ai-workbench/desktop
npm run build -w @ai-workbench/desktop
npm run validate:renderer-entrypoint -w @ai-workbench/desktop
```

2. Run the validation:

```powershell
npm run validate:terminal-panel-configuration -w @ai-workbench/desktop
```

Or from the repo root:

```powershell
npm run validate:terminal-panel-configuration
```

The default entrypoint is the compiled renderer at `apps/desktop/out/renderer/index.html`. If you need to debug against a live renderer dev server, override it explicitly:

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL='http://localhost:5174'
npm run validate:terminal-panel-configuration
```

## What It Uses

- `run-terminal-panel-configuration-validation.mjs`: boots a Playwright CLI session against the deterministic renderer entrypoint
- `assert-terminal-panel-configuration.js`: executes the terminal configuration assertions
- a stubbed `window.workbenchShell` injected before page load so the renderer can be exercised without a live Electron main process

## Notes

- The pass/fail contract is the command exit status plus explicit interaction assertions.
- This flow intentionally focuses on renderer plus settings synchronization semantics, especially save-without-restart behavior for running terminal sessions.
