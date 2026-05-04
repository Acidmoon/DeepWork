## Why

The Windows alpha and beta package smoke validations currently fail while listing `app.asar` contents, even though the packaged archives exist and can be listed manually. This blocks reliable release preflight because package boundary checks and startup smoke checks cannot complete from the documented commands.

## What Changes

- Make the packaged-app validation flow list `app.asar` contents through a deterministic repo-owned mechanism that works on Windows when invoked from npm scripts.
- Preserve the existing package boundary checks that reject validation assets, source files, logs, local workspace data, and generated release artifacts inside `app.asar`.
- Tighten Windows alpha and beta packaging inputs so workspace-package sources, dependency source trees, test files, and native build scaffolding are excluded while runtime JS and native prebuilds remain available.
- Keep alpha and beta package smoke behavior unchanged apart from allowing the validation to reach and report its existing startup checks.

## Capabilities

### New Capabilities

### Modified Capabilities
- `desktop-regression-validation`: package validation must reliably inspect packaged archive contents before running packaged startup smoke checks.

## Impact

- Affects `apps/desktop/validation/package-win/run-package-win-validation.mjs`.
- Affects `apps/desktop/electron-builder.alpha.json`; beta inherits the shared package boundary settings.
- May affect validation documentation if the command behavior or diagnostics change.
- No runtime application APIs, user workspace data formats, or packaged app behavior are changed.
