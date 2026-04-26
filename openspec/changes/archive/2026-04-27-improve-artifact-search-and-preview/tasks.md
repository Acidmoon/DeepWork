## 1. Workspace State and Copy

- [x] 1.1 Extend `WorkspacePanelViewState` and default workspace panel state with search-query and artifact-preview selection fields.
- [x] 1.2 Add localized UI copy for workspace search, result counts, preview loading, empty preview, and unsupported preview states.

## 2. Search and Result Filtering

- [x] 2.1 Implement metadata-driven workspace search over sessions and artifacts using the existing workspace snapshot data in renderer state.
- [x] 2.2 Update session and artifact result rendering so bucket, origin, and query filters compose cleanly without relying on fixed recent-only slices.
- [x] 2.3 Preserve artifact multi-select and prompt-builder flows while introducing separate preview-target selection behavior.

## 3. Artifact Preview Experience

- [x] 3.1 Add a dedicated artifact preview surface to the workspace panel.
- [x] 3.2 Load artifact preview content lazily through `workspace.readArtifact()` when a preview target is selected.
- [x] 3.3 Show explicit loading, unavailable, and text-preview fallback states for preview requests instead of silent failure.

## 4. Verification

- [x] 4.1 Run desktop renderer typechecking after the workspace search and preview changes land.
- [x] 4.2 Manually verify search, filtering, artifact preview, and prompt selection behavior against saved markdown, JSON, and log artifacts.
