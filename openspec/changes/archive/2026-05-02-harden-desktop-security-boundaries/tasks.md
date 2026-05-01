## 1. Workspace Path Confinement

- [x] 1.1 Add a workspace path resolver that joins artifact relative paths to the active workspace root and rejects paths that escape the root.
- [x] 1.2 Update artifact read logic to ignore persisted `absolutePath` when resolving file content and to fail closed for unsafe artifact records.
- [x] 1.3 Update scope deletion logic so only validated in-workspace artifact files can be removed.
- [x] 1.4 Update artifact upsert logic to repair unsafe or stale persisted absolute paths while preserving valid existing artifact IDs and metadata.

## 2. Settings And Web Panel Boundaries

- [x] 2.1 Add custom web-panel settings normalization for required fields, normalized HTTP/HTTPS home URLs, boolean enabled state, partition fallback, duplicate IDs, and built-in ID collisions.
- [x] 2.2 Normalize built-in web-panel overrides and custom web-panel updates in `SettingsManager.update` and `updateWebPanel`.
- [x] 2.3 Ensure `WebPanelManager` only stores enabled configurations with normalized safe home URLs and returns reserved/error snapshots for unsafe stored targets.
- [x] 2.4 Keep renderer URL validation behavior aligned with the main-process normalizer without treating renderer validation as the final boundary.

## 3. Terminal Transcript Resource Bounds

- [x] 3.1 Replace unbounded `captureBuffer` retention with a bounded, chunked, or incremental transcript persistence strategy.
- [x] 3.2 Ensure long-running terminal sessions preserve visible buffer behavior, transcript metadata, retrieval-audit sync, and restart/dispose behavior after transcript bounding.
- [x] 3.3 Document or encode the transcript size/chunking limit so future validation can assert the intended bound.

## 4. Focused Validation

- [x] 4.1 Add deterministic validation for unsafe workspace artifact read, overwrite, and delete records while confirming valid artifacts still work.
- [x] 4.2 Add deterministic validation for unsafe web-panel settings and malformed custom web-panel settings.
- [x] 4.3 Add deterministic validation for long terminal transcript flush behavior.
- [x] 4.4 Wire the new focused validation into the documented internal alpha or relevant targeted validation command.

## 5. Regression Check

- [x] 5.1 Run `npm run typecheck`.
- [x] 5.2 Run the new focused validation command.
- [x] 5.3 Run `npm run validate:internal-alpha` or document any environment-only blocker with the targeted validation evidence.
- [x] 5.4 Run OpenSpec validation for `harden-desktop-security-boundaries` and resolve any spec/task issues.
