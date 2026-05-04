## Why

The product can already produce and smoke-test an internal Windows alpha directory package, but broader beta distribution needs a tighter contract around packaging shape, startup behavior, and release readiness. That work should be specified separately from the already-complete alpha packaging baseline.

## What Changes

- Define a beta distribution capability that extends beyond internal alpha packaging.
- Document and validate the runtime, packaging, and startup expectations for broader beta builds.
- Keep explicit workspace-selection and settings-normalization behavior intact in packaged beta builds.
- Separate beta readiness from renderer or feature work so release hardening can be tracked independently.

## Capabilities

### New Capabilities

- `desktop-beta-distribution`: Beta desktop distribution packaging, boundaries, and packaged-app behavior.

### Modified Capabilities

- `desktop-regression-validation`: Release validation SHALL cover beta-oriented packaged-app readiness checks where distribution behavior changes.

## Impact

- Affects packaging scripts, packaged smoke validation, and release documentation.
- May later touch signing, installer shape, or update-channel preparation, but does not require those to land in the same implementation step.
