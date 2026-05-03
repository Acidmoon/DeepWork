## 1. Retrieval Summary State

- [x] 1.1 Define a compact terminal retrieval summary shape with query, mode, outcome, selected scope, candidate count, and audit reference fields.
- [x] 1.2 Populate the latest retrieval summary from managed CLI retrieval audit resolution without reading raw artifact content in the renderer.
- [x] 1.3 Ensure no summary is emitted for idle sessions that have not performed retrieval.

## 2. Terminal UI

- [x] 2.1 Render the latest retrieval summary in the terminal details or quiet status region without adding a persistent continuity toolbar.
- [x] 2.2 Show distinct selected-scope, no-match, fallback, and global-preferred states.
- [x] 2.3 Keep links or actions inspection-oriented and route deeper review through Workspace rather than prompt handoff.

## 3. Validation

- [x] 3.1 Add deterministic terminal snapshot fixtures for selected-scope, global fallback, and no-match retrieval summaries.
- [x] 3.2 Extend focused renderer validation to assert inline retrieval context rendering and absence of deprecated continuity chrome.
- [x] 3.3 Run `npm run validate:visual-smoke`, relevant terminal validation, `npm run typecheck`, and `npx openspec validate --all --strict`.
