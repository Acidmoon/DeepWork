## Why

DeepWork already has the infrastructure to persist and mount custom web panels, but the current "add web" flow is still a thin scaffold instead of a browser-like feature. Users need newly added web panels to accept arbitrary URLs, open them immediately, and keep behaving like normal managed browser surfaces rather than provider-specific shortcuts.

## What Changes

- Reframe custom web panels as general-purpose browser surfaces instead of narrowly scoped provider entries.
- Define the supported user flow for adding a web panel by entering any HTTP or HTTPS URL and opening it immediately from the sidebar.
- Clarify that a custom web panel keeps both a persisted home URL and a current navigable address so users can browse like a lightweight browser while still retaining a stable restart target.
- Extend custom web-panel configuration behavior so renaming, editing the home URL, loading another address, enabling or disabling the panel, and reopening it after restart all remain part of one supported lifecycle.
- Preserve existing managed-web safety constraints, including blocking unsafe schemes and keeping disabled panels in an explicit reserved state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-workbench-panels`: Expand managed web-panel behavior so user-defined web panels behave like browser-like surfaces that can open arbitrary safe URLs while retaining persisted home-state restoration.
- `settings-and-panel-extensibility`: Extend the custom web-panel lifecycle so arbitrary URLs, persisted titles, and address-driven browsing are all part of the supported configuration flow.

## Impact

- Renderer add-panel flow and sidebar actions in `apps/desktop/src/renderer/src/App.tsx`
- Web panel UI and in-panel navigation/configuration behavior in `apps/desktop/src/renderer/src/panel-content.tsx`
- Main-process managed web-panel lifecycle in `apps/desktop/src/main/web-panel-manager.ts`
- Shared panel and settings contracts in `packages/core/src/desktop/panels.ts`, `packages/core/src/desktop/settings.ts`, and `packages/core/src/desktop/web-panels.ts`
