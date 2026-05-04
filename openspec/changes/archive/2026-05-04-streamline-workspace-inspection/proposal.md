## Why

Workspace currently succeeds as a secondary inspection surface, but it carries too many responsibilities in one dense page: search and filters, previews, thread repair, maintenance tooling, and helper-command reference all compete for attention. This increases cognitive load and makes intentional inspection feel heavier than it needs to be.

## What Changes

- Restructure Workspace into clearer inspection layers for browsing, selected-scope detail, maintenance, and continuity repair.
- Keep advanced repair and helper-command guidance available, but visually subordinate them to everyday inspection flows.
- Preserve the secondary-inspection role of Workspace while reducing control density on the default surface.
- Add validation coverage for the streamlined Workspace structure where renderer assumptions change.

## Capabilities

### New Capabilities

### Modified Capabilities

- `workspace-context-management`: Workspace SHALL separate routine inspection from advanced maintenance and repair flows.
- `desktop-workbench-panels`: Workspace SHALL remain visually subordinate to primary Web and CLI work surfaces while improving local scannability.
- `desktop-regression-validation`: Renderer validation SHALL cover the streamlined Workspace structure where critical inspection behavior changes.

## Impact

- Affects the Workspace panel renderer, section layout, and local interaction flow.
- May require small adjustments to workspace browsing validation and visual smoke expectations.
