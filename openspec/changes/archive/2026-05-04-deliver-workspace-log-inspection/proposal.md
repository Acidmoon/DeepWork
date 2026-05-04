## Why

Workspace already persists logs and retrieval audits, but the Logs surface still behaves like a bucket placeholder instead of a first-class inspection path. Making logs inspectable closes a gap in the "Workspace is for audit and repair" product direction.

## What Changes

- Promote the Logs workspace panel into a usable inspection surface for log-bucket artifacts.
- Support log-focused filtering, search, selection, metadata display, and text preview using existing workspace snapshot and artifact read APIs.
- Keep Logs secondary to web and CLI conversations; it remains an audit/debugging surface, not a primary workflow.
- Add focused validation for log listing and preview behavior.

## Capabilities

### New Capabilities

### Modified Capabilities
- `workspace-context-management`: Workspace SHALL expose log-bucket artifacts through the normal inspection and preview model.
- `desktop-workbench-panels`: The Logs panel SHALL present a scannable inspection surface rather than a placeholder bucket summary.
- `desktop-regression-validation`: Focused validation SHALL cover log inspection and preview.

## Impact

- Affects Workspace panel rendering, bucket filtering defaults, artifact preview behavior for log records, and validation fixtures.
- No workspace manifest migration is required because log artifacts already exist in the manifest model.
- No new dependency is required.
