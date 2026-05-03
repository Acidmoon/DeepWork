# @ai-workbench/core

Shared desktop-domain package for serializable settings, panel catalogs, workspace models, capture normalization, retrieval metadata, and continuity helpers used by the Electron app.

This package is intentionally free of Electron runtime dependencies. Main, preload, renderer, validation scripts, and managed workspace helper generation import these types and pure helpers so cross-process contracts stay aligned.

Current responsibilities include:

1. Panel catalogs and defaults for managed Web, CLI, Workspace, Logs, and Settings surfaces.
2. Built-in web-panel metadata, including the enabled MiniMax preset, safe home URLs, persist partitions, and reserved-state defaults.
3. Workspace snapshot, artifact, thread, origin, retrieval-audit, and maintenance-report shapes.
4. Settings defaults and normalization inputs for language, theme, terminal behavior, managed retrieval, workspace profiles, and panel configuration.
5. Managed workspace helper templates used to expose inspection commands such as `aw-suggest`, `aw-artifact`, `aw-maintenance-scan`, and `aw-maintenance-rebuild`.

Keep filesystem access, IPC, `WebContentsView`, PTY lifecycle, and repair execution in the desktop app. Core should only describe the portable data model and pure transformations that those runtime layers share.
