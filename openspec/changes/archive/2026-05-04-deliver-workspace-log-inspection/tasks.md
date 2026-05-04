## 1. Log Inspection Surface

- [x] 1.1 Update the Logs panel default workspace state so it opens focused on the `logs/` bucket with audit-oriented copy.
- [x] 1.2 Render log artifact rows with origin, context label, thread, summary, updated time, and type metadata.
- [x] 1.3 Reuse the existing artifact preview flow to show terminal transcript and retrieval-audit log content on demand.

## 2. Search and Empty States

- [x] 2.1 Ensure free-text search and origin filters compose with the log bucket filter.
- [x] 2.2 Add explicit empty states for no logs, no matching logs, and unavailable log preview.
- [x] 2.3 Preserve Workspace as secondary inspection by avoiding prompt-builder or send-to-CLI actions in Logs.

## 3. Validation

- [x] 3.1 Extend workspace regression fixtures with representative terminal transcript and retrieval-audit log records.
- [x] 3.2 Add or update validation assertions for log listing, search, selection, and preview.
- [x] 3.3 Run `npm run validate:workspace-regression`, `npm run typecheck`, and `npx openspec validate --all --strict`.
