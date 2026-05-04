## Context

The workspace layer derives multiple indexes from artifact records: `artifacts.json`, `context-index.json`, thread indexes, per-thread manifests, and per-origin manifests. The current system rebuilds these during normal operations, but there is no explicit user-facing or helper-command maintenance path for diagnosing drift, missing files, orphaned records, or stale derived indexes.

## Goals / Non-Goals

**Goals:**
- Provide deterministic maintenance operations for scan, rebuild, and safe repair.
- Keep operations explicit and secondary to normal conversation flows.
- Return structured diagnostics suitable for UI display and helper-command output.
- Preserve path confinement and avoid broad destructive cleanup by default.

**Non-Goals:**
- Do not add background scheduled maintenance.
- Do not delete user files outside existing explicit deletion flows.
- Do not implement cloud backup, sync, or version history.
- Do not require users to understand raw manifest formats.

## Decisions

- Separate scan, rebuild, and repair.
  - Rationale: users should be able to inspect findings before applying changes.
  - Alternative considered: one-click repair-only flow. That hides risk and makes diagnostics harder to trust.
- Make rebuild idempotent and derived-state focused.
  - Rationale: derived indexes can be regenerated safely from artifact records and metadata.
  - Alternative considered: rewriting raw artifact files. That risks data loss and is out of scope.
- Return structured maintenance reports.
  - Rationale: the renderer and helper commands can present the same diagnostic model.
  - Alternative considered: plain text logs only. That would be harder to validate and automate.

## Risks / Trade-offs

- [Repair could accidentally remove useful manifest references] -> Mitigation: default to report-first behavior and keep destructive deletion outside maintenance repair.
- [Large workspaces may make scan slow] -> Mitigation: begin with manifest/index consistency checks and avoid recursive content reads unless needed.
- [Path confinement bugs would be high-risk] -> Mitigation: reuse existing safe workspace path resolution and add validation for unsafe paths.
