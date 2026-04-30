# Workspace Web Capture Validation

This validation flow covers the managed web capture and Workspace Sync path that turns refreshed web context into normal workspace records.

It verifies:

- the Workspace panel sync action triggers the real `workspace.resync()` path used by the renderer
- a deterministic conversation-like web capture result becomes visible as workspace-managed artifacts
- the refreshed workspace snapshot exposes the new session through normal workspace browsing data and continuity summaries
- structured message preview and transcript preview both work from the persisted artifacts

## Prerequisites

1. Run renderer typecheck and refresh the deterministic renderer build:

```powershell
npm run typecheck -w @ai-workbench/desktop
npm run build -w @ai-workbench/desktop
npm run validate:renderer-entrypoint -w @ai-workbench/desktop
```

2. Run the validation:

```powershell
npm run validate:workspace-web-capture -w @ai-workbench/desktop
```

Or from the repo root:

```powershell
npm run validate:workspace-web-capture
```

The default entrypoint is the compiled renderer at `apps/desktop/out/renderer/index.html`. If you need to debug against a live renderer dev server, override it explicitly:

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL='http://localhost:5174'
npm run validate:workspace-web-capture
```

Unset the override to return to the deterministic build entrypoint:

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL=$null
npm run validate:workspace-web-capture
```

Run the full internal alpha sequence when the change crosses multiple validation areas:

```powershell
npm run validate:internal-alpha
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
