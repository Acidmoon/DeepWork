## ADDED Requirements

### Requirement: Desktop runtime initialization uses one orchestration path
The desktop main process SHALL initialize settings, workspace, web panel, terminal, IPC, runtime synchronization, package smoke scheduling, and disposal through a shared orchestration path used by both first startup and later app activation.

#### Scenario: Initial startup uses shared initialization
- **WHEN** the Electron app first becomes ready
- **THEN** the main process creates the DeepWork window and runtime managers through the shared initialization path
- **THEN** startup workspace resolution and terminal workspace-root synchronization match the existing behavior

#### Scenario: Activation uses shared initialization
- **WHEN** the app is activated with no existing windows
- **THEN** the main process recreates the window and runtime managers through the same shared initialization path
- **THEN** the activation path does not duplicate manager construction logic inline

#### Scenario: Runtime disposal remains complete
- **WHEN** the main window closes
- **THEN** web panel and terminal managers are disposed
- **THEN** manager references are cleared so a later activation can initialize a fresh runtime through the shared path

#### Scenario: IPC registration remains stable
- **WHEN** the runtime is initialized
- **THEN** existing preload IPC capabilities continue to resolve to the same public manager operations
- **THEN** startup refactoring does not require renderer callers to change method names or payload shapes
