## MODIFIED Requirements

### Requirement: Scannable secondary Workspace and Settings surfaces
Workspace and Settings SHALL use scannable inspector-style layouts that support audit, debugging, repair, configuration, and workspace profile management without becoming card-heavy dashboards.

#### Scenario: Inspect workspace records with clear hierarchy
- **WHEN** the user opens Workspace
- **THEN** thread, scope, artifact, preview, and advanced repair regions are separated by clear headings, dividers, and list/detail hierarchy
- **THEN** Workspace remains visually subordinate to Web and CLI conversation surfaces

#### Scenario: Edit settings in a concise form layout
- **WHEN** the user opens Settings
- **THEN** implemented preferences appear in predictable form rows with clear labels and controls
- **THEN** workspace profile controls are presented as active settings for saved workspace roots and startup default behavior
- **THEN** no deferred preference placeholder section is rendered when no deferred preference entries are defined
- **THEN** any future deferred preference placeholders appear only when explicitly defined and do not read like active configuration controls

#### Scenario: Keep Home focused on current workspace status
- **WHEN** the user opens Home after workspace profile management is available
- **THEN** Home continues to show the active workspace root, initialization state, saved context counts, and quick choose-workspace action
- **THEN** detailed profile list management remains in Settings rather than turning Home into a profile administration screen
