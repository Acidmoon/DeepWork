## MODIFIED Requirements

### Requirement: Natural-language-first CLI interaction
Managed CLI sessions SHALL treat ordinary user messages as the primary interaction mode and SHALL rely on workspace retrieval instead of manual context handoff prompts when earlier context matters.

#### Scenario: Handle a self-contained request directly
- **WHEN** the user sends a request that does not depend on prior workspace history
- **THEN** the managed CLI session answers directly
- **THEN** the interaction does not require a separately generated workspace handoff prompt

#### Scenario: Mention a prior session in natural language
- **WHEN** the user refers to an earlier session, source, or saved workspace context in ordinary language
- **THEN** the managed CLI session consults workspace retrieval helpers on demand
- **THEN** the session narrows to the relevant scope before reading raw artifact content

#### Scenario: Avoid renderer-generated prompt packaging
- **WHEN** the user needs prior workspace context while talking to a managed CLI session
- **THEN** the supported path is to describe the need in natural language rather than generate a renderer-side handoff prompt
- **THEN** the managed session remains responsible for deciding whether to retrieve workspace context

### Requirement: Optional manual workspace inspection
The system MAY still expose manual artifact or scope inspection surfaces for operator review, but managed CLI retrieval SHALL NOT depend on renderer-side prompt packaging.

#### Scenario: Inspect workspace context manually
- **WHEN** an operator explicitly opens a workspace scope, artifact preview, or helper command output
- **THEN** that inspection serves as optional review or debugging support
- **THEN** normal CLI use still remains direct natural-language interaction without mandatory manual handoff steps

#### Scenario: Inspect without send-to-CLI controls
- **WHEN** the operator is reviewing saved workspace context from the renderer
- **THEN** the inspection surface does not need prompt preview, target-panel selection, or send-to-CLI controls to remain useful
- **THEN** any manual review stays separate from the managed CLI retrieval path
