## Why

DeepWork already has focused regression flows for workspace browsing, managed web capture, and panel configuration, but most browser-driven validation scripts still assume a live `localhost:5173` dev server. That makes the validation contract less reproducible than the product behavior it is supposed to protect.

## What Changes

- Provide a deterministic renderer validation entrypoint that does not depend on an operator-managed localhost dev server.
- Update browser-driven validation flows to target a shared repo-managed entrypoint while preserving explicit URL override support for debugging.
- Keep deterministic runtime stubs and fixture-driven assertions for workspace, web-capture, custom-web-panel, and terminal-panel validation flows.
- Document and script the internal-alpha regression sequence that combines typecheck, retrieval-helper validation, and browser-driven renderer validation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-regression-validation`: add a deterministic renderer entrypoint and internal-alpha regression workflow for focused browser-driven validation flows.

## Impact

- Affected code: renderer validation scripts under `apps/desktop/validation/`, any supporting package scripts, and validation documentation.
- Affected systems: browser-driven validation entrypoint resolution, precheck workflow, and failure messaging for missing validation prerequisites.
- Validation impact: all browser-driven validation flows should run against the same deterministic renderer entrypoint instead of assuming a live dev server.
