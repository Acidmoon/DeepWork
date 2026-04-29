## Context

DeepWork already treats managed terminal panels as real work surfaces rather than disposable shells: sessions bootstrap into the workspace, carry thread identity, and persist transcript plus retrieval-audit records. At the same time, terminal configuration remains uneven. Built-in CLI panels are defined in code with only global prelude override support, while custom CLI panels already persist `shell`, `shellArgs`, `cwd`, and `startupCommand` in settings but expose almost none of that through the renderer.

This means the system already has most of the runtime wiring for configurable terminal panels, but not the product surface or persistence shape needed to make those capabilities usable. The next change should deliver a coherent terminal-configuration contract instead of extending one-off hardcoded terminal behavior again.

## Goals / Non-Goals

**Goals:**
- Add persisted configuration support for built-in CLI panel overrides without turning built-in panels into arbitrary unmanaged shells.
- Expose editable terminal configuration for custom CLI panels using the settings and panel-state flows that already exist.
- Define explicit behavior for when saved configuration applies to idle sessions versus already running PTY sessions.
- Preserve workspace bootstrap, retrieval helper loading, transcript persistence, and thread continuity behavior after terminal configuration becomes editable.

**Non-Goals:**
- Replacing the terminal manager or PTY transport model.
- Building a full global terminal policy system inside the settings panel.
- Changing workspace bootstrap ordering or allowing users to disable managed workspace bootstrap for built-in CLI panels.
- Adding non-PowerShell terminal runtimes for built-in panels beyond supported override fields in this slice.

## Decisions

### 1. Persist built-in CLI overrides separately from custom CLI definitions

Built-in CLI panels should gain a dedicated persisted override shape rather than being folded into `customTerminalPanels`.

Why:
- Built-in panels need stable identity and app-owned shell/bootstrap behavior.
- Separate storage keeps the difference between “managed provider defaults” and “user-defined CLI panels” explicit.

Alternative considered:
- Reusing the custom terminal definition shape for built-in panels was rejected because it would blur ownership boundaries and make it easier to accidentally turn managed built-ins into arbitrary shell entries.

### 2. Expose terminal configuration in the terminal panel surface, not the global settings panel

Terminal panel configuration should live with the terminal panel details/drawer so users can inspect runtime status and saved launch behavior in one place. Global settings should continue owning global prelude commands and future terminal-policy placeholders.

Why:
- The configuration is panel-specific, not app-global.
- The panel already has a details surface that can evolve from read-only inspection to editable configuration without inventing another navigation surface.

Alternative considered:
- Moving terminal configuration into the settings panel was rejected because it would mix per-panel launch behavior with app-wide preferences and make custom CLI editing harder to contextualize.

### 3. Use explicit save-plus-restart semantics for running sessions

Saving terminal configuration should update persisted settings and synchronized runtime definitions immediately, but it should not silently tear down an already running PTY session. Running sessions should continue until the user explicitly restarts or otherwise relaunches the panel.

Why:
- Silent PTY recreation risks losing in-flight CLI work.
- Explicit restart semantics are easier to reason about and validate.

Alternative considered:
- Hot-restarting the running session on every save was rejected because it would couple configuration editing to destructive runtime behavior.

### 4. Keep built-in editable fields narrower than custom CLI fields

Built-in CLI panels should expose supported override fields such as working directory and startup command, while custom CLI panels can edit shell, shell arguments, working directory, and startup command.

Why:
- Built-in panels represent known managed agent entrypoints with app-owned shells and bootstrap.
- Custom CLI panels exist specifically to support arbitrary shell workflows.

Alternative considered:
- Allowing built-in shell and shell-argument replacement was rejected because it would weaken the distinction between managed built-ins and custom panels.

### 5. Represent custom shell arguments as persisted arrays with line-oriented editing

Custom CLI shell arguments should remain stored as `string[]`, while the renderer can expose them through a line-oriented editing surface rather than command-line token parsing.

Why:
- The current model already uses arrays.
- One-argument-per-line editing avoids quote-splitting ambiguity and keeps serialization deterministic.

Alternative considered:
- Parsing one free-form command line string into arguments was rejected because shell quoting rules are ambiguous and platform-specific.

## Risks / Trade-offs

- [Built-in override scope grows too far] → Keep built-in editable fields intentionally narrow and app-owned.
- [Users expect saves to affect a running PTY immediately] → Show explicit restart/apply cues and document that saves affect the next launch unless restarted.
- [Renderer and terminal manager drift on config state] → Route all saves through persisted settings and reuse the existing settings-sync path for both renderer and main-process updates.
- [Custom CLI config becomes hard to validate] → Keep the configuration model plain-data and add focused validation around persistence plus restart behavior.

## Migration Plan

No destructive migration is required. This should be an additive settings evolution:
1. Introduce the built-in terminal override storage shape with backward-compatible defaults.
2. Keep existing custom CLI panel settings readable without transformation beyond filling missing optional fields.
3. Reuse the existing settings update flow so older settings files still hydrate into valid defaults.

Rollback can remove the new renderer controls and ignore the additive built-in terminal override fields while leaving existing custom panel settings intact.

## Open Questions

- Should the first implementation include a dedicated “Restart to Apply” action in the terminal configuration surface, or is reusing the existing restart control with better copy sufficient?
