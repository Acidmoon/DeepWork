## ADDED Requirements

### Requirement: Global terminal behavior preferences
Managed terminal panels SHALL honor global terminal behavior preferences for renderer-side interaction behavior while preserving the existing PTY session lifecycle and panel-level launch configuration contracts.

#### Scenario: Apply scrollback preference
- **WHEN** terminal behavior settings specify a supported scrollback line count
- **THEN** mounted terminal views use that line count for terminal buffer retention
- **THEN** changing the setting updates terminal view configuration without requiring a terminal session restart

#### Scenario: Apply copy-on-selection preference
- **WHEN** terminal behavior settings enable copy-on-selection
- **THEN** selecting text in a terminal view attempts to copy the selected text through the renderer clipboard path
- **THEN** disabling the setting leaves terminal text selection available without automatic copy behavior

#### Scenario: Apply paste confirmation preference
- **WHEN** terminal behavior settings require confirmation for multi-line paste
- **THEN** a multi-line paste requests user confirmation before text is written to the managed terminal session
- **THEN** canceling the confirmation prevents the pasted text from being sent to the PTY

#### Scenario: Preserve terminal launch configuration boundaries
- **WHEN** the user edits global terminal behavior settings
- **THEN** built-in and custom terminal panel shell, working-directory, shell-argument, startup-command, and restart-to-apply behavior remain governed by the terminal panel configuration surface
- **THEN** running PTY processes are not recreated solely because global terminal behavior settings changed
