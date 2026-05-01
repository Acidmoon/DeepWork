## Context

The desktop app hosts three privileged surfaces in one Electron process boundary: workspace file persistence, managed browser panels, and PTY-backed terminal sessions. The renderer currently performs some validation, but the main process owns the actual file, browser, and process operations and therefore must enforce the final trust boundary.

The current implementation already has good user-facing flows and repeatable validation. The hardening work should preserve those flows while making malformed persisted state and direct IPC calls fail closed.

## Goals / Non-Goals

**Goals:**
- Keep all workspace artifact reads, writes, and deletes confined to the selected workspace root.
- Normalize and reject unsafe web-panel settings in the main process, including persisted settings loaded at startup.
- Normalize custom web-panel definitions to the same defensive standard already used for custom terminal panels.
- Prevent managed terminal transcript persistence from retaining or rewriting unbounded content during long sessions.
- Add deterministic validation for the new boundary behavior.

**Non-Goals:**
- Redesign the renderer UI for workspace, web, or terminal panels.
- Remove support for user-defined web or CLI panels.
- Sandbox arbitrary custom CLI shells beyond the existing user-configurable terminal feature.
- Encrypt or redact workspace artifacts, terminal logs, or browser captures.

## Decisions

### Resolve Artifact Paths From Workspace-Relative Records

Workspace operations will treat `artifact.path` as the durable file identity and resolve it against the active `workspaceRoot`. The resolved path must remain inside the workspace root before any read, write, or delete proceeds. Persisted `absolutePath` may be repaired or ignored when it disagrees with the resolved safe path.

Alternative considered: continue using `absolutePath` and only validate before operations. This leaves two sources of truth and makes corrupted manifests harder to repair consistently.

### Centralize Main-Process Web URL Normalization

The main process will use the existing `normalizeWebPanelUrl` behavior for saved web-panel home URLs and navigation-equivalent configuration changes. Invalid or unsupported home URLs will be rejected or dropped during settings normalization before they reach `WebContentsView.loadURL`.

Alternative considered: rely on renderer validation. Renderer validation is helpful for UX, but it is not a security boundary because settings can be loaded from disk and IPC methods can be invoked directly by any compromised renderer context.

### Normalize Custom Web Panels Like Custom Terminal Panels

`SettingsManager` will add a custom web-panel normalizer that accepts only array entries with valid `id`, `title`, `sectionId`, normalized safe `homeUrl`, boolean `enabled`, and a non-empty partition. Duplicate custom IDs and IDs that collide with built-in panel IDs will be ignored deterministically.

Alternative considered: allow malformed entries and let downstream managers handle nulls. That spreads defensive code across web manager, renderer store, and navigation code and still permits startup crashes.

### Bound Terminal Transcript Persistence

The terminal manager will avoid retaining an ever-growing `captureBuffer`. Acceptable implementations include rolling transcript chunks, capped captured text, or incremental persistence from the existing terminal log. The visible xterm buffer remains governed by the existing renderer scrollback preference and main-process display buffer cap.

Alternative considered: increase `MAX_BUFFER_SIZE` and use it for transcript persistence. That would reduce memory risk but still rewrite large artifacts on every flush and would not scale for long sessions.

### Validate Boundary Cases With Focused Scripts

Validation should be focused and deterministic. It does not need to boot a live Electron session for every case if the same code paths can be exercised through manager-level tests or existing browser-driven harnesses.

Alternative considered: rely on the full internal alpha flow only. That flow is useful, but it currently validates happy paths more than hostile persisted state or long-running resource behavior.

## Risks / Trade-offs

- Existing manifests may contain stale `absolutePath` values → The implementation should repair snapshots by deriving safe absolute paths from `artifact.path` rather than discarding otherwise valid artifacts.
- Some manually edited custom web panels may be dropped after normalization → Invalid entries should fail closed and, where practical, leave clear settings or validation evidence for diagnosis.
- Transcript bounding can reduce the amount of automatically indexed terminal context → Keep the complete terminal log file where feasible, and make the indexed transcript bounded for retrieval and preview stability.
- Validation code can become too coupled to implementation helpers → Prefer public manager APIs and stable normalization functions over private internals where possible.
