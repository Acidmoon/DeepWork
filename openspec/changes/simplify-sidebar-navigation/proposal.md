## Why

The sidebar currently exposes a search field and `Ctrl+K` hint even though the workbench only presents a small, directly navigable set of tools. This creates a dead affordance, adds visual noise, and makes the shell feel more complex than the product actually is.

## What Changes

- Remove the sidebar search field and shortcut hint from the desktop renderer shell.
- Keep the sidebar focused on section headers, panel rows, and explicit add-panel actions.
- Preserve compact spacing and active-state clarity after the unused search row is removed.
- Revalidate the renderer shell after the navigation simplification.

## Capabilities

### New Capabilities

### Modified Capabilities

- `desktop-workbench-panels`: Sidebar navigation SHALL omit placeholder search chrome when direct panel navigation is sufficient.

## Impact

- Affects sidebar renderer markup and styles in the desktop shell.
- May require focused renderer validation updates if navigation chrome assumptions change.
