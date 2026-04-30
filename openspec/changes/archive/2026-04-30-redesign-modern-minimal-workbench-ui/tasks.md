## 1. Establish the Modern Minimal Design System

- [x] 1.1 Add or confirm an icon dependency for repeated toolbar and navigation commands
- [x] 1.2 Replace renderer theme tokens with neutral surface, border, text, accent, focus, warning, danger, spacing, radius, and dimension tokens
- [x] 1.3 Refactor common buttons, icon buttons, inputs, selects, textareas, pills, rows, menus, and focus states to use the new token system
- [x] 1.4 Remove decorative gradients, glass effects, oversized radii, and heavy shadows from default renderer surfaces

## 2. Redesign Shell, Navigation, and Toolbars

- [x] 2.1 Redesign the app shell, sidebar, section headers, navigation rows, open indicators, and context menu as compact list-style workbench chrome
- [x] 2.2 Redesign the top toolbar with stable height, predictable command placement, icon-first common commands, accessible labels, and clear disabled states
- [x] 2.3 Redesign the status line as quiet metadata without card or banner styling
- [x] 2.4 Verify shell, sidebar, toolbar, and status line remain coherent in light and dark themes

## 3. Redesign Primary Web and CLI Work Surfaces

- [x] 3.1 Convert Web panel details from a floating card-like drawer into a minimal inspector surface while preserving home URL, partition, enabled, loading, error, and persistence controls
- [x] 3.2 Convert Terminal panel details from a floating card-like drawer into a minimal inspector surface while preserving shell, args, cwd, startup command, status, launch count, PID, buffer, and restart-to-apply controls
- [x] 3.3 Preserve immersive WebContentsView and terminal viewport framing so the session remains the primary visual focus
- [x] 3.4 Ensure Web and Terminal toolbar controls do not resize or overlap while state changes

## 4. Redesign Secondary Workspace and Settings Surfaces

- [x] 4.1 Redesign Workspace as a scannable inspector with clear thread, scope, artifact, preview, and advanced repair hierarchy
- [x] 4.2 Preserve Workspace search, filter, selected-scope detail, artifact preview, thread creation, rename, reassignment, and scope deletion behavior
- [x] 4.3 Redesign Settings as concise form rows with predictable label/control alignment and visible deferred preference placeholders
- [x] 4.4 Verify English and Simplified Chinese labels remain readable without overlap or clipped controls

## 5. Update Visual Validation and Documentation

- [x] 5.1 Add or update browser-driven validation evidence for representative Web, Terminal, Workspace, and Settings surfaces against the deterministic renderer entrypoint
- [x] 5.2 Add constrained-viewport visual checks or documented screenshot acceptance steps for toolbar, sidebar, forms, lists, inspectors, and previews
- [x] 5.3 Update validation documentation to describe the visual smoke expectations for UI redesign work
- [x] 5.4 Run `npm run validate:internal-alpha` and `openspec validate --all --strict --json`
