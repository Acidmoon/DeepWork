## ADDED Requirements

### Requirement: Modern minimal renderer visual language
The desktop renderer SHALL use a modern minimal visual language based on neutral surfaces, thin dividers, restrained accent color, compact spacing, and small-radius controls instead of decorative gradients, heavy shadows, glass effects, or oversized card styling.

#### Scenario: Render the workbench with restrained surfaces
- **WHEN** the desktop renderer shell loads
- **THEN** the app background, sidebar, toolbar, canvas, and status line use neutral theme tokens rather than decorative gradients
- **THEN** boundaries are communicated primarily through thin borders, dividers, spacing, and clear typography

#### Scenario: Preserve focused accent usage
- **WHEN** a navigation item, button, input, or status element needs emphasis
- **THEN** the UI uses accent color only for selected, focused, primary, warning, or destructive states
- **THEN** accent colors do not dominate the whole interface or turn the workbench into a one-note palette

### Requirement: Consistent component density and geometry
The renderer SHALL apply consistent dimensions, spacing, and geometry for navigation rows, toolbar controls, form controls, status indicators, list rows, and inspector surfaces.

#### Scenario: Use stable toolbar and control dimensions
- **WHEN** Web, Terminal, Workspace, Settings, or Home panels are active
- **THEN** toolbar controls keep stable heights and widths appropriate to their command type
- **THEN** hover, active, disabled, loading, and error states do not resize or shift the toolbar layout

#### Scenario: Keep text readable inside controls
- **WHEN** localized labels, status text, URLs, paths, or thread titles appear inside UI controls or rows
- **THEN** text wraps, truncates, or uses overflow handling without overlapping adjacent controls
- **THEN** the UI remains readable in both English and Simplified Chinese

### Requirement: Accessible icon and command styling
The renderer SHALL use recognizable icon-first controls for common repeated commands while preserving accessible names and visible text for less obvious actions.

#### Scenario: Render common toolbar commands as icons
- **WHEN** the toolbar shows common commands such as back, forward, reload, home, close, details, start, restart, or sync
- **THEN** the command uses a consistent icon treatment where a standard icon exists
- **THEN** the command exposes an accessible label and an understandable hover tooltip or equivalent affordance

#### Scenario: Keep complex actions text-labeled
- **WHEN** an action is destructive, workflow-specific, or not universally recognizable
- **THEN** the control keeps a clear text label or icon-plus-text label
- **THEN** destructive actions remain visually distinct without relying only on color

### Requirement: Responsive and theme-safe layout
The renderer SHALL maintain a coherent modern minimal layout across the supported desktop window size and constrained viewport widths, and SHALL support light and dark themes using the same token structure.

#### Scenario: Adapt constrained widths without overlap
- **WHEN** the renderer is viewed at constrained widths supported by the app
- **THEN** sidebar, toolbar, panel body, drawers, lists, and forms reflow without overlapping controls or clipped primary content
- **THEN** fixed-format elements retain stable dimensions through responsive constraints

#### Scenario: Preserve dark theme hierarchy
- **WHEN** the app is in dark theme
- **THEN** the same hierarchy of surface, border, text, muted text, accent, warning, and danger tokens remains distinguishable
- **THEN** dark theme does not rely on blue-heavy gradients or decorative glow effects
