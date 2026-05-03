## Why

Settings and custom panel management currently work, but they still feel alpha-level: profile renaming persists on every keystroke, user-defined panel creation relies on prompts, and management actions are scattered between inline edits and context menus. That is functional, but it is not yet a durable product workflow.

## What Changes

- Refine workspace profile editing so persistence happens through explicit save behavior rather than per-keystroke writes.
- Replace prompt-driven and context-menu-only custom panel management with clearer in-surface editing flows where appropriate.
- Keep built-in and custom panel boundaries intact while making management actions more predictable.
- Extend validation for the updated settings and panel-management behavior.

## Capabilities

### New Capabilities

### Modified Capabilities

- `settings-and-panel-extensibility`: Settings and custom panel management SHALL use clearer explicit-edit flows for persisted changes.
- `desktop-regression-validation`: Focused validation SHALL cover updated settings and panel-management interaction behavior.

## Impact

- Affects Settings panel UX, custom panel management UI, and persistence timing.
- Does not change underlying settings ownership, manager synchronization, or built-in panel boundaries.
