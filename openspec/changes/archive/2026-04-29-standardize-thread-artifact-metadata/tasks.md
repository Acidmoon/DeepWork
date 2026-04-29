## 1. Define shared normalization rules

- [x] 1.1 Centralize summary, tag, and thread-linked inspection metadata rules for manual, web, terminal, message-index, and retrieval-audit artifacts
- [x] 1.2 Apply backward-compatible normalization during manifest and index rebuilds without rewriting raw artifact files

## 2. Update artifact producers and consumers

- [x] 2.1 Update transcript, web-capture, message-index, retrieval-audit, and manual-save flows to emit the normalized inspection envelope
- [x] 2.2 Update workspace browsing and retrieval helpers to group and inspect thread-linked artifacts using the standardized fields

## 3. Validate mixed artifact continuity

- [x] 3.1 Extend deterministic workspace fixtures to cover mixed artifact types inside one continuing thread
- [x] 3.2 Verify backward compatibility for older manifests and retrieval-audit records after normalization
