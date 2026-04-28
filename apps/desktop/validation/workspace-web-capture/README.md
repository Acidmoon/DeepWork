# Workspace Web Capture Validation

This validation flow covers the managed web capture and Workspace Sync path that turns refreshed web context into normal workspace records.

It verifies:

- the Workspace panel sync action triggers the real `workspace.resync()` path used by the renderer
- a deterministic conversation-like web capture result becomes visible as workspace-managed artifacts
- the refreshed workspace snapshot exposes the new session through normal workspace browsing data
- structured message preview and transcript preview both work from the persisted artifacts

## Prerequisites

1. Start the desktop renderer dev server:

```powershell
npm run dev -w @ai-workbench/desktop
```

2. In another terminal, run renderer typecheck:

```powershell
npm run typecheck -w @ai-workbench/desktop
```

3. Run the validation:

```powershell
npm run validate:workspace-web-capture -w @ai-workbench/desktop
```

Or from the repo root:

```powershell
npm run validate:workspace-web-capture
```

If the renderer dev server binds to a different local port, override it explicitly:

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL='http://localhost:5174'
npm run validate:workspace-web-capture
```

If local HTTP access is constrained, validate against the compiled renderer instead:

```powershell
npm run build -w @ai-workbench/desktop
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL='file:///E:/vibecoding/DeepWork/apps/desktop/out/renderer/index.html'
npm run validate:workspace-web-capture
```

## What It Uses

- `fixtures/workspace-snapshot.before.json`: empty workspace state before sync
- `fixtures/workspace-snapshot.after.json`: workspace state after a managed web capture is persisted
- `fixtures/artifact-contents.before.json`: empty artifact content map before sync
- `fixtures/artifact-contents.after.json`: persisted transcript and message-index content after sync
- `run-workspace-web-capture-validation.mjs`: validation runner that injects a mutable workspace mock
- `assert-workspace-web-capture.js`: explicit pass/fail checks for sync, discovery, and preview behavior

## Notes

- This flow intentionally validates one deterministic managed web capture scenario, not provider-wide website compatibility.
- The pass/fail contract is the command exit status plus the explicit assertions in the script.
