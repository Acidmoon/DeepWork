## 1. Fix

- [x] 1.1 Replace `config.partition.trim()` with `String(config.partition ?? '').trim()` in `normalizeManagedWebPanelConfig` at `apps/desktop/src/main/web-panel-manager.ts:241`

## 2. Verify

- [x] 2.1 Run `npm run typecheck` to confirm no type errors
