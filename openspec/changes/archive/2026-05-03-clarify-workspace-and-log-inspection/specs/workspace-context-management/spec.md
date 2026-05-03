## ADDED Requirements

### Requirement: Mode-specific inspection hierarchy
The workspace inspection model SHALL expose the active filter state clearly and SHALL adapt its detail hierarchy to the current inspection mode so conversational context and runtime logs are not presented as the same reading task.

#### Scenario: Clarify active inspection constraints
- **WHEN** the operator changes bucket, source, thread scope, or search query while inspecting workspace-managed records
- **THEN** the panel surfaces the active constraints near the top of the inspection flow
- **THEN** list headings, result counts, and empty states reflect the current mode and active constraints

#### Scenario: Prioritize selected source detail in Workspace mode
- **WHEN** the active inspection mode is conversation or context browsing and a source is selected
- **THEN** the panel emphasizes selected source detail before related artifact inventory
- **THEN** artifact preview remains a dedicated follow-on surface instead of duplicating the selected source summary in another competing pane

#### Scenario: Prioritize record browsing in Logs mode
- **WHEN** the active inspection mode is log browsing
- **THEN** the panel emphasizes log source selection, log record rows, and raw preview content
- **THEN** operators do not need to interpret conversation-oriented labels to inspect runtime records
