## ADDED Requirements

### Requirement: Consistent thread-linked artifact metadata
The workspace SHALL persist thread-linked artifacts using a consistent metadata and summary envelope across manual saves, managed web captures, managed CLI transcripts, message indexes, and retrieval audit records.

#### Scenario: Persist a managed artifact with normalized inspection metadata
- **WHEN** the workspace manager persists a manual, web, terminal, or retrieval-audit artifact linked to a scope and thread
- **THEN** the saved artifact record includes normalized capture-mode labeling, context-label metadata, and thread-linked identity fields expected for that artifact type
- **THEN** the artifact summary and tags are derived from the same normalization rules used for later workspace browsing

#### Scenario: Rebuild legacy artifact indexes without rewriting files
- **WHEN** existing workspace artifacts do not yet carry every normalized inspection field
- **THEN** workspace-managed manifest or index rebuilds derive the missing inspection metadata during rebuild
- **THEN** the raw artifact files remain unchanged while later browsing and retrieval use consistent derived summaries and tags
