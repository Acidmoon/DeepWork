## ADDED Requirements

### Requirement: Modern minimal workbench shell
The workbench shell SHALL present the desktop app as a modern minimal operational workspace with a compact sidebar, stable top toolbar, unframed primary canvas, and quiet status line.

#### Scenario: Navigate with a compact sidebar
- **WHEN** the renderer displays navigation sections and panel definitions
- **THEN** the sidebar uses list-style rows with clear active, hover, open, and closed states
- **THEN** the sidebar avoids oversized cards, decorative badges, and gradient active blocks

#### Scenario: Preserve a stable top toolbar
- **WHEN** the active panel changes between Web, Terminal, Workspace, Settings, Home, or Tool surfaces
- **THEN** the top toolbar keeps a consistent height and command placement
- **THEN** panel-specific controls appear without shifting unrelated toolbar regions

### Requirement: Minimal primary work surfaces
The Web and Terminal panel surfaces SHALL remain immersive primary work surfaces while configuration and runtime details appear as restrained inspector surfaces rather than decorative floating cards.

#### Scenario: Show Web panel details as an inspector
- **WHEN** the user opens Web panel details
- **THEN** persisted home URL, partition, session persistence, enabled state, loading state, and navigation status appear in a minimal inspector surface
- **THEN** the live web content remains the primary visual focus

#### Scenario: Show Terminal panel details as an inspector
- **WHEN** the user opens Terminal panel details
- **THEN** shell configuration, working directory, startup command, launch count, PID, buffer size, status, and restart-to-apply state appear in a minimal inspector surface
- **THEN** the terminal viewport remains the primary visual focus

### Requirement: Scannable secondary Workspace and Settings surfaces
Workspace and Settings SHALL use scannable inspector-style layouts that support audit, debugging, repair, and configuration without becoming card-heavy dashboards.

#### Scenario: Inspect workspace records with clear hierarchy
- **WHEN** the user opens Workspace
- **THEN** thread, scope, artifact, preview, and advanced repair regions are separated by clear headings, dividers, and list/detail hierarchy
- **THEN** Workspace remains visually subordinate to Web and CLI conversation surfaces

#### Scenario: Edit settings in a concise form layout
- **WHEN** the user opens Settings
- **THEN** implemented preferences appear in predictable form rows with clear labels and controls
- **THEN** deferred preference placeholders remain visible without reading like active configuration controls
