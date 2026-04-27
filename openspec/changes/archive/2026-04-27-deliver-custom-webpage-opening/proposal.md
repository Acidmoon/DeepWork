## Why

DeepWork already has managed web-panel infrastructure and basic custom web-panel plumbing, but the current change framing is too narrow because it centers on activating a MiniMax-specific web entry. The product need is broader: users should be able to add, open, and manage arbitrary custom web pages from the desktop workbench as a supported capability, with MiniMax treated as one possible target rather than the only one.

## What Changes

- Re-scope this change from enabling a MiniMax web panel to delivering first-class custom webpage opening in the desktop workbench.
- Define the supported user flow for creating a custom web panel, opening it from navigation, and persisting its URL, partition, title, and enabled state across restarts.
- Align renderer navigation, settings persistence, and main-process web-panel management so user-defined web panels behave like supported workbench panels instead of a provider-specific exception.
- Keep provider-specific destinations such as MiniMax as optional configured pages that reuse the same generic custom web-panel capability.
- Preserve existing managed web-panel safety constraints, including reserved-state handling for disabled panels and unsafe-navigation blocking.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-workbench-panels`: Expand managed web-panel behavior so custom user-defined web pages can be opened, restored, and managed as first-class workbench panels alongside built-in panels.
- `settings-and-panel-extensibility`: Clarify and extend the custom web-panel lifecycle so arbitrary web pages can be created, configured, persisted, enabled or disabled, and reopened through the normal settings and navigation flow.

## Impact

- Desktop renderer navigation and panel state management in `apps/desktop/src/renderer/src/App.tsx`
- Main-process web panel registration and lifecycle management in `apps/desktop/src/main/web-panel-manager.ts`
- Web panel settings and in-panel controls in `apps/desktop/src/renderer/src/panel-content.tsx`
- Potential shared settings, store, and localization updates if the finalized UX or panel metadata contract changes
