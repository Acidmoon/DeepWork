## MODIFIED Requirements

### Requirement: Scannable secondary Workspace and Settings surfaces
Workspace and Settings SHALL use scannable inspector-style layouts that support audit, debugging, repair, configuration, and workspace profile management without flattening routine inspection and advanced operator controls into one visual layer.

#### Scenario: Inspect workspace records with clear hierarchy
- **WHEN** the user opens Workspace
- **THEN** thread, scope, artifact, and preview regions appear as the primary inspection hierarchy
- **THEN** maintenance, helper-command reference, and repair controls remain available in clearly secondary sections
- **THEN** Workspace remains visually subordinate to Web and CLI conversation surfaces

#### Scenario: Edit settings in a concise form layout
- **WHEN** the user opens Settings
- **THEN** implemented preferences appear in predictable form rows with clear labels and controls
- **THEN** workspace profile controls are presented as active settings for saved workspace roots and startup default behavior
- **THEN** remaining deferred preference placeholders remain visible without reading like active configuration controls

#### Scenario: Keep Home focused on current workspace status
- **WHEN** the user opens Home after workspace profile management is available
- **THEN** Home continues to show the active workspace root, initialization state, saved context counts, and quick choose-workspace action
- **THEN** detailed profile list management remains in Settings rather than turning Home into a profile administration screen
