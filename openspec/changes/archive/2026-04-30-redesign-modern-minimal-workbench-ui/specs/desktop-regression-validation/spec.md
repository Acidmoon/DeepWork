## ADDED Requirements

### Requirement: Visual smoke validation for redesigned renderer surfaces
The repository SHALL provide validation guidance or checks that protect the modern minimal renderer redesign from blank surfaces, overlapping controls, clipped text, and broken primary work-surface framing.

#### Scenario: Validate representative desktop surfaces
- **WHEN** developers run the focused renderer validation set after the UI redesign
- **THEN** validation covers representative Web, Terminal, Workspace, and Settings surfaces against the deterministic renderer entrypoint
- **THEN** the checks confirm the primary canvas is nonblank and key toolbar/sidebar controls are visible

#### Scenario: Validate constrained viewport layout
- **WHEN** developers inspect or automate the redesigned renderer at constrained viewport widths
- **THEN** navigation, toolbar, forms, lists, drawers, and preview areas do not overlap or clip important text
- **THEN** validation evidence is captured through screenshots, DOM checks, or documented manual acceptance steps
