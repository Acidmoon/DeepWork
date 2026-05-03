## Why

MiniMax is still represented as a reserved built-in web preset even though the workbench already supports safe managed web panels and custom web pages. Enabling MiniMax as a usable built-in preset exercises the multi-provider web-panel path and removes a visible reserved surface from normal navigation.

## What Changes

- Enable the built-in MiniMax web preset by default with a safe HTTPS home URL and persistent partition.
- Make MiniMax follow the same managed web-panel lifecycle as DeepSeek and custom web panels.
- Preserve the ability to disable or override the built-in preset through existing built-in web-panel settings.
- Add focused validation for opening, navigating, disabling, and restoring the MiniMax built-in panel.

## Capabilities

### New Capabilities

### Modified Capabilities
- `desktop-workbench-panels`: MiniMax SHALL be available as a live built-in managed web panel by default.
- `settings-and-panel-extensibility`: Built-in web-panel settings SHALL support MiniMax defaults and user overrides.
- `desktop-regression-validation`: Focused validation SHALL cover the enabled MiniMax built-in preset.

## Impact

- Affects built-in web panel catalog defaults, renderer navigation copy, main-process web panel registration, and custom-web validation fixtures.
- No external dependency is required; the panel uses the existing `WebContentsView` infrastructure.
- User settings that explicitly disable MiniMax continue to win over defaults.
