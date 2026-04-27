## 1. Scope Retrieval Metadata

- [x] 1.1 Extend the shared workspace index models and builders to store scope-level retrieval metadata on `ContextIndexEntry`.
- [x] 1.2 Update workspace manifest rebuild logic to derive searchable scope metadata from indexed artifact summaries, tags, and type/origin fields only.

## 2. Retrieval Rules And Helpers

- [x] 2.1 Rewrite the managed workspace protocol and agent instruction blocks to codify self-contained vs context-dependent retrieval behavior.
- [x] 2.2 Update `WORKBENCH_TOOLS.ps1` so `aw-suggest` ranks scopes from `context-index.json` and supports machine-readable output without exposing raw artifact content.

## 3. Managed CLI Session Awareness

- [x] 3.1 Extend terminal bootstrap to publish stable session identity metadata needed by retrieval-aware helper commands.
- [x] 3.2 Persist session-scoped retrieval audit entries that record the query, candidate scopes, selected scope, or no-match outcome for managed CLI lookups.

## 4. Validation

- [x] 4.1 Add regression coverage or repo-owned validation fixtures for self-contained requests, scope-first lookup, and no-global-context retrieval behavior.
- [x] 4.2 Run desktop validation/typecheck and manually verify that a managed CLI session can locate one relevant prior scope from natural-language input without broad workspace scanning.
