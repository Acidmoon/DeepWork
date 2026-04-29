## ADDED Requirements

### Requirement: Extracted ownership of workspace continuity planning
The desktop core-domain package SHALL own the runtime-independent rules that decide how implicit workspace captures and managed sessions resolve thread continuity when desktop adapters already have the required plain-data inputs.

#### Scenario: Plan implicit thread continuity from core rules
- **WHEN** the desktop main process needs to decide whether an implicit capture should reuse an existing scope thread, continue the active thread, or require a new thread seed
- **THEN** that deterministic decision comes from a `packages/core` desktop-domain module
- **THEN** the desktop adapter remains responsible only for loading manifests, creating thread records, and writing the resulting state

#### Scenario: Validate continuity planning without runtime objects
- **WHEN** developers verify workspace continuity planning behavior
- **THEN** the extracted core module accepts and returns plain serializable data
- **THEN** the behavior can be checked without Electron, filesystem handles, or PTY objects

### Requirement: Extracted ownership of managed workspace content templates
The desktop core-domain package SHALL own the runtime-independent content templates and builders that define managed workspace protocol text, managed agent instruction blocks, and shell-helper template content.

#### Scenario: Build managed workspace instructions from core templates
- **WHEN** the desktop app needs the canonical workspace protocol, managed agent instruction blocks, or helper-script content for a workspace
- **THEN** the textual template ownership comes from a `packages/core` desktop-domain module
- **THEN** the desktop app remains responsible for choosing file paths and persisting the generated content

#### Scenario: Preserve shell-specific writing in the desktop adapter
- **WHEN** the desktop app synchronizes `WORKSPACE_PROTOCOL.md`, `AGENTS.md`, or related managed files
- **THEN** the write operations still execute inside `apps/desktop`
- **THEN** the extracted core module does not perform filesystem side effects directly
