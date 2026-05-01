## Context

`normalizeManagedWebPanelConfig` in `web-panel-manager.ts:241` normalizes `WebPanelConfig` objects before they are stored or used to create panel views. It currently calls `config.partition.trim()` directly, trusting the TypeScript type (`partition: string`). However, this function can receive data originating from persisted settings JSON, IPC calls, or custom panel definitions — any of which could contain `null` or `undefined` for `partition` at runtime.

## Goals / Non-Goals

**Goals:**
- Prevent a main-process crash if `partition` is `null` or `undefined` at runtime.
- Preserve the existing fallback behavior: use `persist:${config.id}` when partition is empty.

**Non-Goals:**
- Add runtime type validation for other fields.
- Change the `WebPanelConfig` interface.
- Add logging or telemetry for malformed data.

## Decisions

### Use `String(config.partition ?? '')` instead of optional chaining

`String(null)` → `'null'`, which would pass the `||` check and produce `'null'` as the partition name — incorrect. `String(undefined)` → `'undefined'`, same problem.

`String(config.partition ?? '')` ensures `null`/`undefined` become `''`, which then falls through `||` to the default `persist:${config.id}`.

Alternative considered: `(config.partition ?? '').trim()`. This works but is slightly less defensive — if `partition` were a number or object, `.trim()` would throw. `String()` handles all primitive coercions safely.

## Risks / Trade-offs

- If `partition` is ever a non-string truthy value (e.g., a number), `String()` would convert it rather than crashing. This is acceptable since the expected type is always `string`.
- No functional change for valid inputs.
