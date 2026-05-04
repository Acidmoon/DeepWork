## MODIFIED Requirements

### Requirement: Modern minimal workbench shell
The workbench shell SHALL present the desktop app as a modern minimal operational workspace with a compact navigation-only sidebar, stable top toolbar, unframed primary canvas, and quiet status line.

#### Scenario: Navigate with a compact sidebar
- **WHEN** the renderer displays navigation sections and panel definitions
- **THEN** the sidebar uses list-style rows with clear active, hover, open, and closed states
- **THEN** the sidebar avoids oversized cards, decorative badges, gradient active blocks, and placeholder search or command controls that do not correspond to real navigation actions

#### Scenario: Preserve a stable top toolbar
- **WHEN** the active panel changes between Web, Terminal, Workspace, Settings, Home, or Tool surfaces
- **THEN** the top toolbar keeps a consistent height and command placement
- **THEN** panel-specific controls appear without shifting unrelated toolbar regions
