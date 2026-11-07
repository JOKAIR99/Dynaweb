# Dynaweb Studio: audit and architecture

## Phase 0 audit (2026-11-07)

| Item | Finding |
|---|---|
| Remote | `https://github.com/JOKAIR99/Dynaweb`, one commit (`a6dee59 Initial commit`) on `main` |
| Files | `README.md` (two lines), `LICENSE` (MIT, 2026 Jokair), `.gitignore` (GitHub's Python template) |
| Code | None. No Python code exists, so there was no architecture to preserve. |
| Local folder | `Documents\DynaWeb` was empty and not a Git repository; the remote was cloned into it. |
| Toolchain | Node 24.21, npm 11.19, Python 3.12.10 |

### Stack decision

The product is a browser-based visual editor whose output is HTML, CSS and JavaScript. TypeScript on both the editor and the runtime lets one schema (Zod) type the model, validate it at runtime and drive the editor forms, with no translation layer. The Python `.gitignore` is kept (and extended for Node) so a Python backend can be added later (Phase 5 AI service or Phase 6 publishing) without conflict.

| Concern | Choice | Why |
|---|---|---|
| Editor UI | React 18 + Vite 5 | Mature, fast dev server, large contributor pool |
| Model and validation | Zod 3 | Schema is the single source of truth for types and runtime checks |
| Animation runtime | Native browser APIs (IntersectionObserver, requestAnimationFrame, CSS transforms) | Zero dependencies in exported sites, no licence constraints; GSAP or Motion were evaluated and are not needed for the three systems at this stage |
| Persistence | Versioned JSON in `localStorage`, behind an injectable `KeyValueStore` | Works offline today; a server store can replace it without touching the editor |
| Tests | Vitest + jsdom | Shares Vite's config; runtime tested with fake IntersectionObserver and viewport |

## Architecture

```
          Commands (UI today, AI assistant in Phase 5)
                        |
                        v
  src/model/commands.ts  applyCommand(project, command)  -> validated new Project (immutable)
                        |
                        v
  src/model/schema.ts    Project -> Pages -> Sections -> { content, style, animations[] }
        |                                   |
        v                                   v
  src/storage/           src/render/html.ts + css.ts   (model -> HTML, used by canvas AND export)
  projectStore.ts                           |
  (versioned, migrated)                     v
                         src/runtime/engine.js  (parallax, reveal, horizontal; ships inside every site)
```

- **The model is the source of truth.** HTML is always derived. Nothing is stored as generated markup.
- **One write path.** Every change is a `Command` applied by `applyCommand`, which validates the result against the schema. An invalid command returns an error and leaves the project untouched. This is the contract the AI assistant will use.
- **IDs** are `<prefix>_<base36>`, produced by an injectable generator: sequential (deterministic) in generation and tests, crypto-random in the editor.
- **Editor and runtime are separate.** The canvas is a sandboxed iframe (`allow-scripts`, no same origin) rendering exactly the exported HTML plus a small selection script. The exported site contains no editor code.

### Animation engine rules (from Hallmark's design floor, MIT)

1. Content is fully visible with scripting off: hidden reveal states apply only after the runtime marks elements.
2. `prefers-reduced-motion: reduce` or theme motion `none` disables every effect.
3. Only `transform`, `opacity`, `filter` and `clip-path` animate. Never `width`, `height`, `top`, `left`.
4. One passive scroll listener and one `requestAnimationFrame` drive parallax and horizontal scroll. Reveals use IntersectionObserver. Off-screen parallax sections are skipped.
5. `destroy()` removes every listener, observer and inline style; `init()` twice never stacks listeners.
6. Parallax and horizontal scroll both own a section's scroll transform, so the model forbids combining them on one section.
7. Horizontal sections fall back to a vertical stack (or a native swipe carousel) at 767 px and below.

## Directory structure

```
src/
  model/       schema.ts, commands.ts, defaults.ts, ids.ts
  generator/   presets.ts (design identities), generate.ts (brief -> project)
  render/      html.ts, css.ts
  runtime/     engine.js (dependency-free, inlined into exports)
  storage/     projectStore.ts
  editor/      Editor.tsx, CreateWizard.tsx, useProject.ts, controls.tsx, exportSite.ts, panels/
tests/         model, storage, render, runtime
.claude/skills/hallmark/   Hallmark design skill (MIT, commit 407fa68), installed for design reviews
```

## Roadmap status

| Phase | Status |
|---|---|
| 0 Audit | Done |
| 1 Foundation: model, persistence, main interface | Done (vertical slice) |
| 2 Visual editor | Mostly done: canvas selection, sidebars, drag-and-drop ordering, devices, zoom, undo/redo. Missing: inline text editing on canvas, element-level (not section-level) selection, assets panel |
| 3 Design engine | Working: brief engine (schema v2), art-direction proposals, structure planner, 6 presets, 14 section types, working contact and booking forms, micro-interactions, SEO output (see `docs/interaction-specs.md`). Layout variants per section type (schema v3), chosen per preset. Missing: custom font loading, FAQ section, multi-page |
| 4 Animation engine | Working: parallax (layers, depth, mouse, direction, scale, perspective), reveal (12 effects, 6 targets, stagger, easing, once/replay, timeline view), horizontal (pin, speed, direction, snap, progress, indicators, mobile fallback). Missing: element-level animation targets, scroll start/end positions for parallax |
| 5 AI integration | Not started. The Command contract is ready for it |
| 6 Export and publishing | Single-file HTML export and JSON project files work. Missing: multi-page export as a ZIP, local asset bundling, publishing |
| 7 QA | 39 unit and integration tests; manual browser checks at 1280 and 375 px. Missing: Playwright end-to-end tests, accessibility audit |

## Known risks

- Google Fonts are loaded from Google's CDN; offline exports fall back to system fonts.
- `localStorage` is limited to about 5 MB per origin; large image data URLs would exhaust it. Images are URLs only for now.
- The canvas re-renders the whole iframe on each change. This is fine for single pages; large sites will need incremental patching.
