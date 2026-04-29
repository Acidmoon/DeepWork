## ADDED Requirements

### Requirement: Normalized managed transcript metadata
Managed terminal transcript persistence SHALL write normalized artifact summaries and tags that remain aligned with the session scope and thread identity used at launch.

#### Scenario: Persist transcript content with normalized session labels
- **WHEN** a managed CLI session flushes transcript content into the workspace
- **THEN** the saved transcript artifact uses normalized summary, tags, and metadata fields for the launch's panel identity, context label, session scope, and thread
- **THEN** later workspace browsing can group that transcript with related message, audit, or manual artifacts from the same thread

#### Scenario: Update transcript content without identity drift
- **WHEN** later transcript flushes update an existing session artifact
- **THEN** the workspace preserves the original session-linked identity fields for that artifact
- **THEN** only the content, summary-derived inspection fields, and latest-update metadata change as needed
