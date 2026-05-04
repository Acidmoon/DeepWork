## Context

The workspace model already has a `logs/` bucket and persisted log artifacts for terminal transcripts and retrieval audits. The renderer can search artifacts and preview text-compatible content, but the Logs navigation item still communicates mostly as a scaffolded bucket. This change turns that existing data into a deliberate inspection experience.

## Goals / Non-Goals

**Goals:**
- Make Logs open directly into log-bucket inspection.
- Reuse existing workspace snapshot, filtering, artifact list, and `readArtifact` preview paths.
- Preserve the distinction between log inspection and routine CLI continuation.
- Cover terminal transcript logs and retrieval audit logs in validation fixtures.

**Non-Goals:**
- Do not implement external log ingestion.
- Do not build full log tailing or live streaming.
- Do not add send-to-CLI or prompt-building actions from Logs.

## Decisions

- Treat Logs as a specialized Workspace view over `logs/`.
  - Rationale: the existing workspace panel model already supports bucket filtering and artifact preview.
  - Alternative considered: create a separate log viewer subsystem. That would duplicate search and preview behavior.
- Keep text preview as the first supported log rendering mode.
  - Rationale: current log artifacts are text or JSONL-style content.
  - Alternative considered: parse all log formats into structured tables. That is useful later but not required for first-class inspection.
- Validate with fixture log artifacts.
  - Rationale: deterministic fixtures can cover transcript and retrieval audit logs without running live PTY sessions.

## Risks / Trade-offs

- [Large logs may be expensive to preview] -> Mitigation: keep preview on demand and respect existing artifact read behavior; defer chunking unless validation shows a real issue.
- [Logs may look like another primary workflow] -> Mitigation: keep copy and layout audit-oriented and do not add handoff actions.
- [Bucket filtering may hide relevant artifact context] -> Mitigation: allow query and origin filters to compose with the log bucket.
