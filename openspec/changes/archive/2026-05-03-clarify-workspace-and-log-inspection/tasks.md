## 1. Inspection Information Architecture

- [x] 1.1 Refactor the Workspace panel presentation so Workspace and Logs derive explicit mode-specific headings, descriptions, and pane purposes from the shared state model.
- [x] 1.2 Replace the current stacked intro and repeated summary flow with a clearer primary inspection header that surfaces the active workspace, active thread scope, and current filter context.

## 2. Renderer Layout and Interaction Clarity

- [x] 2.1 Rebuild the Workspace inspection flow so source discovery, selected source detail, related records, and artifact preview follow one obvious reading order without duplicated summary panes.
- [x] 2.2 Rebuild the Logs inspection flow so log source selection, log record browsing, and raw preview use log-oriented labels and no longer feel like a lightly relabeled conversation view.
- [x] 2.3 Strengthen selected-state cues, empty states, and responsive layout behavior while keeping thread repair, maintenance, and technical sections subordinate to the main inspection region.

## 3. Regression Protection

- [x] 3.1 Extend the deterministic workspace regression validation to assert the clarified Workspace reading flow, including stable headings or state markers for filters, selected detail, and preview.
- [x] 3.2 Extend the same validation flow to assert the distinct Logs hierarchy, log-oriented labels, and preview behavior.
- [x] 3.3 Run `npm run build -w @ai-workbench/desktop`, `npm run validate:renderer-entrypoint -w @ai-workbench/desktop`, `npm run validate:workspace-regression -w @ai-workbench/desktop`, `npm run typecheck -w @ai-workbench/desktop`, and `npx openspec validate --all --strict`.
