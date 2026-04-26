## Context

DeepWork is already implemented as a desktop Electron workbench centered on `apps/desktop`, with separate main-process managers for web panels, terminal panels, workspace persistence, and settings persistence. The current product surface is real enough to need requirements: the app launches a live window, mounts managed web/terminal runtimes, persists workspace artifacts to disk, and exposes a renderer UI for context selection and prompt delivery.

The codebase also shows a clear boundary between what is already working and what is still incomplete for MVP:

- Completed work:
  - Single-window Electron shell with preload bridge and renderer state store.
  - PTY-backed Codex and Claude terminal panels with persistent sessions and transcript capture.
  - DeepSeek live web panel with persistent partition, safe navigation guardrails, and automatic context capture.
  - Workspace initialization, artifact manifests, scope-level indexes, helper PowerShell commands, clipboard save, artifact read, and scope deletion.
  - Settings persistence for language, theme, workspace root, terminal prelude commands, built-in panel overrides, and custom web/CLI panels.
- Unfinished MVP work:
  - MiniMax remains a reserved panel rather than a live web runtime.
  - Workspace search box is present in the shell but not wired to retrieval behavior.
  - Artifact browsing is index-first but still lacks richer preview, open-path actions, and bucket-specific workflows.
  - HTML Preview is a placeholder tool and does not yet execute render/export flows inside the product.
  - Settings still expose placeholders for prompt templates, default workspace presets, and deeper terminal behavior.
- Structural deficiencies:
  - Business logic remains concentrated in `apps/desktop`; `packages/core` is still only a placeholder.
  - Validation is mostly manual or script-based under `tech-validation/`; the main app has no automated regression suite.
  - Prompt handoff is functional but thin: it writes generated prompts into running terminals without acknowledgement, richer delivery semantics, or artifact-open shortcuts.

The user request explicitly forbids changing current application code. This design therefore documents the existing implementation faithfully and turns gaps into explicit baseline constraints and follow-up work, rather than attempting to "fix" them in the same change.

## Goals / Non-Goals

**Goals:**

- Establish an OpenSpec baseline that matches the current codebase instead of an aspirational roadmap.
- Separate the current product contract into capability-oriented specs that future changes can modify safely.
- Record completed work, unfinished MVP scope, and structural gaps in a form that can drive later changes.
- Keep this change documentation-only so source behavior remains untouched.

**Non-Goals:**

- Refactor code out of `apps/desktop` into `packages/core`.
- Implement missing MVP features such as richer artifact preview, MiniMax activation, or render/export flows.
- Change UX copy, routing, persistence format, or runtime boot behavior.
- Retroactively rewrite project history into multiple archived OpenSpec changes.

## Decisions

### 1. Baseline the code that exists, not the roadmap that was intended

The baseline will be derived from current behavior in main, preload, shared, and renderer modules. This avoids a common failure mode where specs describe a cleaner architecture than the running system and immediately become false.

Alternative considered: write specs from README and phase copy alone. Rejected because the repo already contains placeholder panels and future-facing text that would overstate product completeness if treated as implemented behavior.

### 2. Split the baseline into four capabilities aligned to stable seams

The baseline is divided into:

- `desktop-workbench-panels`
- `workspace-context-management`
- `agent-session-handoff`
- `settings-and-panel-extensibility`

These seams match the current module boundaries and future change boundaries. They are stable enough for subsequent changes to extend independently without first inventing new capability names.

Alternative considered: create one large "deepwork-mvp" spec. Rejected because it would be too coarse to safely evolve and would mix UI shell behavior, workspace persistence, and agent delivery semantics in one file.

### 3. Treat incomplete areas as explicit reserved states or follow-up gaps

Where the product intentionally exposes unfinished functionality, the baseline spec will preserve that truth instead of pretending the feature is complete. Reserved web panels, placeholder settings, and tool scaffolds are legitimate parts of the current contract.

Alternative considered: exclude unfinished surfaces from the baseline. Rejected because those surfaces already exist in the UI and code paths, so they must be specified to prevent accidental regressions or misleading future changes.

### 4. Record structural gaps in design/tasks, not as fake requirements

The empty `packages/core` package, limited validation strategy, and thin prompt-delivery semantics are real architecture issues. They should be documented as follow-up work, but not encoded as already-satisfied requirements.

Alternative considered: make the baseline spec require modular extraction and automated tests immediately. Rejected because that would make the baseline inaccurate on day one and violate the user's constraint against changing the code now.

### 5. Keep the change documentation-only

This change adds OpenSpec artifacts only. It establishes a standard for future work without altering the current application.

Alternative considered: perform baseline-alignment refactors while writing the specs. Rejected because it would conflate discovery, standardization, and implementation in one step.

## Risks / Trade-offs

- [Spec drift from implementation] -> Mitigation: the baseline is anchored to current code paths and should be updated only through later OpenSpec changes.
- [Capabilities overlap at the edges] -> Mitigation: keep runtime ownership in panel/workspace specs and keep prompt delivery limited to agent-session-handoff.
- [Baseline normalizes weak structure] -> Mitigation: explicitly record structural deficiencies in this design and push them into follow-up changes rather than leaving them implicit.
- [Future contributors may treat placeholder UI as completed product] -> Mitigation: specs and tasks call out reserved/planned behavior as incomplete MVP scope.

## Migration Plan

No runtime migration is required.

Recommended operational sequence after this change:

1. Use these baseline specs as the source of truth for future OpenSpec changes.
2. Create focused follow-up changes for unfinished MVP workflows.
3. Create separate architectural hardening changes for core extraction and automated validation.

## Open Questions

- Should future baseline archive work convert these change-local capability specs into `openspec/specs/` only after one or more follow-up implementation changes land?
- Should custom terminal targets receive a formal output-directory contract, since the current prompt builder falls back to `outputs/agent` while workspace initialization does not create that bucket?
- Should the project treat `tech-validation/` as an implementation dependency, a verification harness, or a temporary transition artifact?
