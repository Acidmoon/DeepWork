## ADDED Requirements

### Requirement: Repository has line-ending normalization
The repository SHALL include a `.gitattributes` file at the root that declares `* text=auto` so that Git normalizes line endings for all text files to LF in the repository.

#### Scenario: Text files are stored with LF
- **WHEN** a text file is committed
- **THEN** Git stores it with LF line endings regardless of the committer's platform

#### Scenario: Git diff does not emit CRLF warnings on Windows
- **WHEN** `git diff` is run on Windows with modified files
- **THEN** no "LF will be replaced by CRLF" warnings appear
