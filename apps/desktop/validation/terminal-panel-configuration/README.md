# Terminal Panel Configuration Validation

This validation flow covers the terminal-panel configuration lifecycle introduced by the terminal configuration change:

- edit a built-in CLI panel's supported overrides from the terminal details drawer
- persist those overrides through the settings sync path
- confirm a running PTY session stays stable after save
- explicitly restart to apply the updated launch configuration
- edit a custom CLI panel's shell, shell arguments, working directory, and startup command

## Prerequisites

1. Start the desktop renderer dev server:

```powershell
npm run dev -w @ai-workbench/desktop
```

2. In another terminal, run typecheck:

```powershell
npm run typecheck -w @ai-workbench/desktop
```

3. Run the validation:

```powershell
npm run validate:terminal-panel-configuration -w @ai-workbench/desktop
```

Or from the repo root:

```powershell
npm run validate:terminal-panel-configuration
```

## What It Uses

- `run-terminal-panel-configuration-validation.mjs`: boots a Playwright CLI session against the renderer dev server
- `assert-terminal-panel-configuration.js`: executes the terminal configuration assertions
- a stubbed `window.workbenchShell` injected before page load so the renderer can be exercised without a live Electron main process

## Notes

- The pass/fail contract is the command exit status plus explicit interaction assertions.
- This flow intentionally focuses on renderer plus settings synchronization semantics, especially save-without-restart behavior for running terminal sessions.
