## Context

The renderer currently has the correct product structure: a persistent sidebar, a top toolbar, a central work surface, and focused panel components for Web, Terminal, Workspace, Home, Tools, and Settings. The visual implementation is still more decorative than the product direction: gradients, soft glass surfaces, large rounded corners, repeated pill shapes, and card-like sections compete with the primary Web and CLI work surfaces.

The redesign should treat DeepWork as an operational desktop workbench:

```text
┌──────────────┬────────────────────────────────────┐
│ Sidebar      │ Toolbar                            │
│ navigation   ├────────────────────────────────────┤
│              │ Primary work surface               │
│ Web          │ Web / CLI / Workspace / Settings   │
│ CLI          │                                    │
│ Workspace    ├────────────────────────────────────┤
│ Settings     │ Quiet status line                  │
└──────────────┴────────────────────────────────────┘
```

## Goals / Non-Goals

**Goals:**
- Establish a modern minimal visual system that can be reused across all renderer panels.
- Make Web and CLI surfaces feel like the primary workspace, with chrome that supports rather than competes with the session.
- Make Workspace and Settings easier to scan by using clear rows, dividers, inspector layouts, and restrained grouping.
- Replace decorative gradients, oversized radii, heavy shadows, and pill-heavy controls with simple borders, compact spacing, and stable component dimensions.
- Preserve current behavior and IPC contracts while changing layout, styling, and focused renderer controls.
- Add validation expectations for visual smoke coverage across desktop and constrained viewport widths.

**Non-Goals:**
- Redesigning product flows, persistence models, workspace indexing, terminal management, web capture, or retrieval behavior.
- Creating a marketing-style landing page, hero layout, illustrative background, or decorative visual theme.
- Moving Workspace back into the primary context-steering workflow.
- Replacing focused validation with a full Electron end-to-end test suite.

## Decisions

### Use a tokenized neutral design system
Define renderer-level CSS tokens for background, surface, border, text, muted text, accent, danger, warning, focus, spacing, radii, and toolbar/sidebar dimensions. The default theme should use neutral grays and white surfaces. Dark mode should use near-black neutral surfaces rather than blue-heavy gradients.

Alternative considered: tune the existing gradient/glass palette. Rejected because the stated goal is modern minimal, and the current visual style's decorative surfaces are the main source of mismatch.

### Keep the shell layout, simplify the chrome
Keep the current sidebar + toolbar + canvas + status-line architecture in `App.tsx`, but reduce visual weight:
- sidebar as compact navigation list with simple active indicator
- toolbar as one stable command row
- canvas as a clean unframed work surface
- status line as quiet metadata, not a card or banner

Alternative considered: rebuild the entire shell structure. Rejected because the current component boundaries are workable and broad structural churn would raise regression risk without improving the visual outcome.

### Replace card stacks with section rows and inspector layouts
Workspace and Settings should move away from stacked card-like sections. Workspace should read as a secondary inspector with lists, detail, preview, and advanced repair affordances separated by dividers. Settings should read as a concise form surface with predictable label/control alignment.

Alternative considered: keep current section markup and only change colors. Rejected because the current card-like rhythm is part of what makes the UI feel heavier than intended.

### Use icon-first controls for repeated toolbar commands
Toolbar navigation commands, details toggles, close/open affordances, and common panel actions should use recognizable icons with accessible labels and tooltips where needed. Add `lucide-react` if no existing icon package is available.

Alternative considered: continue using text symbols such as arrows and home glyphs. Rejected because the redesign should look intentional and consistent, and common toolbar commands are better represented by standard icons.

### Validate visually after behavior still passes
The redesign should continue to pass the existing internal-alpha validation sequence. In addition, browser-driven validation should capture or inspect representative renderer states so regressions like blank canvas, overlapping controls, clipped text, or unreadable toolbar/sidebar states are caught.

Alternative considered: rely on manual inspection only. Rejected because UI work is broad and can regress across panel types and viewport widths.

## Risks / Trade-offs

- [A broad CSS rewrite can accidentally change panel behavior] -> Keep IPC contracts unchanged, update visual structure in narrow component slices, and run `validate:internal-alpha`.
- [Minimal styling can become too flat or lose affordance] -> Use consistent focus rings, hover states, selected indicators, and disabled states.
- [Icon-only controls can become unclear] -> Provide aria labels and tooltips for unfamiliar commands; keep text where commands are not universally recognizable.
- [Workspace density can become overwhelming] -> Keep Workspace as a secondary inspector, group advanced thread repair tools behind subordinate controls, and preserve clear empty/loading/unavailable states.
- [Responsive layouts may overlap after density changes] -> Validate at desktop and constrained widths with screenshots and text-overlap checks.

## Migration Plan

1. Introduce renderer design tokens and update shell/sidebar/toolbar/status-line styles.
2. Update common controls, action buttons, nav items, inputs, pills, and rows to use the minimal system.
3. Refactor Web and Terminal detail drawers into minimal inspector surfaces while preserving existing state fields and actions.
4. Refactor Workspace and Settings panel layouts for scanning and reduced card nesting.
5. Add or update validation screenshots/checks for representative desktop and constrained viewport states.
6. Run `npm run validate:internal-alpha` and OpenSpec validation before archiving.
