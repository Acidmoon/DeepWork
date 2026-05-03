## 1. Maintenance Operations

- [x] 1.1 Define structured maintenance report types for scan findings, rebuild results, and safe repair actions.
- [x] 1.2 Add WorkspaceManager operations for integrity scan, derived index rebuild, and non-destructive safe repair.
- [x] 1.3 Expose maintenance operations through preload workspace APIs and managed helper commands.
- [x] 1.4 Ensure all maintenance file access uses workspace path confinement checks.

## 2. Workspace UI

- [x] 2.1 Add a secondary maintenance section to Workspace with scan, rebuild, and safe repair controls.
- [x] 2.2 Render structured findings for missing files, orphaned manifest records, stale derived indexes, duplicate IDs, and unsafe paths.
- [x] 2.3 Keep maintenance controls visually subordinate to normal Workspace inspection and require explicit action before repair.

## 3. Validation

- [x] 3.1 Add deterministic fixtures for stale indexes, missing artifact files, orphaned records, duplicate records, and unsafe paths.
- [x] 3.2 Add focused validation for scan-only diagnostics, rebuild idempotence, and safe repair results.
- [x] 3.3 Run `npm run validate:workspace-regression`, `npm run validate:security-boundaries`, `npm run typecheck`, and `npx openspec validate --all --strict`.
