## Why

DeepWork's current renderer already has the right product structure, but the visual language still reads as a soft, card-heavy prototype with gradients, large rounded surfaces, and decorative chrome. A modern minimal workbench style will better match the product direction: web and CLI panels as primary work surfaces, Workspace as a focused secondary inspector, and settings as a quiet operational surface.

## What Changes

- Introduce a shared desktop UI design system for neutral surfaces, concise typography, restrained color, simple borders, compact controls, and consistent spacing.
- Redesign the workbench shell around a cleaner sidebar, stable top toolbar, focused work canvas, and quiet status line.
- Replace decorative gradients, heavy shadows, oversized radii, and pill-heavy surfaces with thin dividers, small-radius controls, and utilitarian visual hierarchy.
- Rework Web and Terminal details from floating card-like drawers into minimal inspector surfaces that do not distract from the primary work session.
- Rework Workspace and Settings surfaces for better scanning, clearer information hierarchy, and fewer nested card-like panels.
- Add validation guidance for visual regression checks across desktop and constrained widths, including no text overlap, no blank primary surfaces, and preserved focused-flow behavior.

## Capabilities

### New Capabilities
- `desktop-ui-design-system`: Defines the modern minimal visual language, component constraints, layout density, and accessibility expectations for the desktop renderer.

### Modified Capabilities
- `desktop-workbench-panels`: Workbench shell, sidebar, toolbar, panel surfaces, and inspector details adopt the modern minimal interaction and layout contract.
- `desktop-regression-validation`: Focused validation includes visual smoke checks for the redesigned renderer surfaces in addition to behavioral assertions.

## Impact

- Affected code: renderer shell and panel styling in `apps/desktop/src/renderer/src/App.tsx`, `styles.css`, and focused panel components under `panel-content/`.
- Affected validation: browser-driven desktop validation flows may need screenshots or visual checks after the redesign.
- Affected dependencies: likely introduce an icon package such as `lucide-react` if no existing icon system is present.
- No intended changes to main-process IPC contracts, workspace persistence, terminal management, or web capture behavior.
