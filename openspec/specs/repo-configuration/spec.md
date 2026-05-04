# repo-configuration Specification

## Purpose
Define repository-level configuration that keeps cross-platform development behavior predictable for contributors and automation.
## Requirements
### Requirement: Repository has line-ending normalization
The repository SHALL include a `.gitattributes` file at the root that declares `* text=auto` so that Git normalizes line endings for all text files to LF in the repository.

#### Scenario: Text files are stored with LF
- **WHEN** a text file is committed
- **THEN** Git stores it with LF line endings regardless of the committer's platform

#### Scenario: Git diff does not emit CRLF warnings on Windows
- **WHEN** `git diff` is run on Windows with modified files
- **THEN** no "LF will be replaced by CRLF" warnings appear

### Requirement: Active OpenSpec changes remain current
The repository SHALL keep `openspec/changes/` reserved for changes that are not yet completed or archived, and SHALL archive completed changes through the normal OpenSpec workflow.

#### Scenario: Completed change is archived
- **WHEN** a change under `openspec/changes/` has all implementation and validation tasks complete
- **THEN** the change is archived through the OpenSpec archive command path rather than remaining as active work
- **THEN** active change listings no longer include that completed change

#### Scenario: Incomplete change remains active
- **WHEN** a change still has unchecked implementation, validation, design, or release-readiness tasks
- **THEN** the change remains under `openspec/changes/`
- **THEN** it is not archived solely because adjacent changes have completed

### Requirement: Repository provides a static quality gate
The repository SHALL provide a root-level static quality command that complements TypeScript typechecking by checking configured lint and/or formatting rules for source and validation files.

#### Scenario: Run static quality gate from root
- **WHEN** a developer runs the documented root static quality command
- **THEN** the command checks the configured repository source set
- **THEN** failures identify the file or rule that needs correction

#### Scenario: Static quality gate preserves typecheck role
- **WHEN** a developer runs the existing typecheck command
- **THEN** TypeScript semantic validation remains available separately
- **THEN** the static quality gate does not replace `npm run typecheck`

### Requirement: Repository documents concise onboarding path
The repository SHALL document a concise startup path for first-time contributors or operators while preserving detailed reference documentation for deeper workflows.

#### Scenario: Follow quickstart path
- **WHEN** a new contributor opens the repository documentation
- **THEN** they can find the minimal install, typecheck, and dev startup commands without reading the full reference guide
- **THEN** the quickstart points to focused validation and release-readiness commands for deeper checks

#### Scenario: Preserve detailed README reference
- **WHEN** a developer needs workspace, validation, packaging, or release details
- **THEN** the existing detailed documentation remains available
- **THEN** the concise quickstart links or points to the detailed sections rather than replacing them

