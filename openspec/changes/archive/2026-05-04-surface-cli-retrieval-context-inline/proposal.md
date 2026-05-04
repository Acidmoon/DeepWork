## Why

Managed CLI retrieval is already bounded and auditable, but users have to inspect Workspace records or helper outputs to understand what context was selected. A compact inline summary in the CLI panel can explain retrieval outcomes without bringing back heavy continuity chrome or forcing a Workspace detour.

## What Changes

- Surface the latest managed CLI retrieval outcome in the terminal panel state and UI as a compact summary.
- Show selected scope, retrieval mode, fallback/no-match outcome, and audit availability when present.
- Keep the summary subordinate to the terminal conversation and available in status or inspector regions, not as a persistent control bar.
- Add validation for selected-scope, fallback, and no-match inline summaries.

## Capabilities

### New Capabilities

### Modified Capabilities
- `cli-workspace-awareness`: Managed CLI sessions SHALL expose concise retrieval outcome summaries after lookups.
- `desktop-workbench-panels`: Terminal panels SHALL surface retrieval metadata without reintroducing dedicated continuity chrome.
- `desktop-regression-validation`: Focused validation SHALL cover inline retrieval context summaries.

## Impact

- Affects retrieval audit state projection, terminal panel snapshots, renderer terminal UI, and validation fixtures.
- No change to retrieval ranking, artifact reading, or workspace audit persistence is required.
- No external dependency is required.
