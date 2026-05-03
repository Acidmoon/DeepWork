## 1. Renderer Selection Behavior

- [x] 1.1 Update the Workspace session-row click handling so clicking the active row toggles `selectedOrigin` back to `'all'`.
- [x] 1.2 Preserve existing preview, artifact-selection, bucket, and thread-filter state when the source selection is cleared.

## 2. Regression Coverage

- [x] 2.1 Extend the workspace regression assertions to verify repeated-click deselection in the artifact inspection flow.
- [x] 2.2 Extend the workspace regression assertions to verify repeated-click deselection in the log inspection flow.

## 3. Verification

- [x] 3.1 Run `npm run validate:workspace-regression -w @ai-workbench/desktop`.
- [x] 3.2 Run `npm run typecheck -w @ai-workbench/desktop`.
- [x] 3.3 Run `npx openspec validate --all --strict`.
