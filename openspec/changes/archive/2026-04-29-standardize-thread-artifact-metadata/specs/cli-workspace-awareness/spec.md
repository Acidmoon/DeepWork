## ADDED Requirements

### Requirement: Normalized retrieval audit metadata
Managed CLI retrieval audit records SHALL use a consistent summary and metadata shape so thread-aware inspection can compare retrieval outcomes across sessions without transcript parsing.

#### Scenario: Save a selected-scope retrieval outcome with normalized metadata
- **WHEN** a managed CLI lookup resolves and writes a retrieval audit record
- **THEN** the saved audit artifact includes normalized session, thread, outcome, and candidate-scope metadata together with a consistent inspection summary
- **THEN** later workspace inspection can compare retrieval outcomes across sessions using indexed metadata alone

#### Scenario: Save no-match or superseded outcomes consistently
- **WHEN** a managed CLI lookup ends with no selection or is superseded by a later lookup
- **THEN** the saved audit artifact uses the same normalized outcome and identity fields as successful lookups
- **THEN** thread-aware inspection can distinguish the outcome without special-case parsing logic
