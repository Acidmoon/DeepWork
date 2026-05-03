## Why

The renderer currently builds a large primary JavaScript bundle, which is acceptable for internal alpha but leaves little margin for broader beta polish. Startup performance and bundle discipline need their own tracked change so the desktop shell can stay responsive as more product surface area is added.

## What Changes

- Define a renderer performance capability focused on startup bundle size and load behavior.
- Introduce implementation and validation expectations for lazy loading or other startup-focused optimizations.
- Preserve current product behavior while reducing initial renderer cost where possible.
- Track startup-performance work separately from visual or packaging changes.

## Capabilities

### New Capabilities

- `desktop-renderer-performance`: Startup bundle-shaping and load-performance behavior for the desktop renderer.

### Modified Capabilities

- `desktop-regression-validation`: Validation SHALL cover renderer performance baselines or guardrails where startup optimization is introduced.

## Impact

- Affects renderer entry structure, code-splitting or lazy-loading decisions, and performance-oriented validation or measurement.
- Does not require changing product semantics or removing existing panels.
