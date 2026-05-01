## Why

`normalizeManagedWebPanelConfig` in `web-panel-manager.ts` calls `config.partition.trim()` directly, assuming `partition` is always a `string`. If malformed settings from disk or an unexpected call path supply `null` or `undefined`, the runtime TypeError crashes the main process. This is a defense-in-depth fix — the type system says `string`, but persisted data and IPC boundaries don't guarantee it.

## What Changes

- Use `String(config.partition ?? '').trim()` in `normalizeManagedWebPanelConfig` instead of `config.partition.trim()`.

## Capabilities

### New Capabilities
- None (implementation-only hardening, no requirement change).

### Modified Capabilities
- None.

## Impact

- Affected code: `apps/desktop/src/main/web-panel-manager.ts` line 241.
- No behavioral change for valid inputs; malformed `partition` values now safely fall back to the default `persist:${config.id}` instead of crashing.
