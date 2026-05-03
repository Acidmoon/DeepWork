## Why

The project has strong internal-alpha validation, but there is no repeatable Windows distribution path for producing a runnable desktop build outside the development checkout. A release-ready alpha needs a documented package command, clear artifact boundaries, and a smoke check for the packaged app.

## What Changes

- Introduce a Windows alpha distribution capability for producing a packaged DeepWork desktop build.
- Add package scripts and configuration for a repeatable Windows artifact from the existing Electron/Vite output.
- Ensure native module rebuild, app metadata, and generated artifacts are handled predictably.
- Document release preflight steps and add validation coverage for distribution readiness.

## Capabilities

### New Capabilities
- `desktop-release-distribution`: Defines how the repository produces and verifies Windows alpha desktop distribution artifacts.

### Modified Capabilities
- `desktop-regression-validation`: Internal alpha validation SHALL include a distribution preflight path for packaged builds.

## Impact

- Affects root and desktop package scripts, packaging configuration, README/release documentation, and validation commands.
- May introduce one packaging dev dependency, selected during implementation.
- Packaging output must remain outside source-controlled application files and must not include local workspace data.
