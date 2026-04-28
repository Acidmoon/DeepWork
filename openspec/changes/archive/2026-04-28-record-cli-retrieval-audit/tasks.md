## 1. Persist resolved retrieval audit outcomes

- [x] 1.1 Update the managed CLI retrieval helper flow in `apps/desktop/src/main/workspace-manager.ts` so selected, no-match, and superseded lookups always resolve into stable structured audit entries
- [x] 1.2 Ensure pending retrieval state stays transient and is cleared or finalized correctly by the managed session bootstrap/runtime flow in `apps/desktop/src/main/terminal-manager.ts`

## 2. Promote retrieval audit logs into workspace-managed records

- [x] 2.1 Extend the workspace artifact/index model in `packages/core/src/desktop/workspace.ts` and related main-process persistence code so retrieval audit logs become first-class workspace records with searchable metadata
- [x] 2.2 Make the resulting retrieval audit records inspectable through existing Workspace logs/artifact browsing and preview paths

## 3. Revalidate retrieval audit behavior

- [x] 3.1 Update the retrieval validation assets under `apps/desktop/validation/workspace-retrieval/` to assert workspace-managed audit persistence and superseded lookup handling
- [x] 3.2 Run the relevant retrieval-focused verification flow and confirm the expected structured audit outcomes are produced
