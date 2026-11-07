// Contributor issues grounded in the current code (see docs/architecture.md, "Roadmap status").
// Each one is independent and can be picked up by an external contributor.

const body = ({ problem, outcome, context, criteria, difficulty }) => `## Problem
${problem}

## Expected outcome
${outcome}

## Technical context
${context}

## Acceptance criteria
${criteria.map((c) => `- [ ] ${c}`).join('\n')}
- [ ] \`npm run check\` passes

**Estimated difficulty:** ${difficulty}

New to the project? Read [CONTRIBUTING.md](../blob/main/CONTRIBUTING.md) and comment here before you start.`;

const issue = (title, labels, difficulty, fields) => ({
  title,
  labels: [...labels, `difficulty: ${difficulty}`],
  body: body({ ...fields, difficulty }),
});

export const ISSUES = [
  issue('Add an FAQ section with accessible disclosure', ['templates', 'accessibility', 'enhancement', 'good first issue'], 'easy', {
    problem: 'There is no FAQ section.',
    outcome: 'An `faq` section rendering questions and answers with native `<details>`/`<summary>`, so it works without JavaScript.',
    context: 'Items reuse `title` (question) and `text` (answer). Add focus styles via the existing `:focus-visible` tokens in `src/render/css.ts`.',
    criteria: ['Keyboard operable', 'No JavaScript needed', 'Tests for rendering and escaping'],
  }),
  issue('Load any Google Fonts family chosen in the Theme tab', ['frontend', 'design', 'enhancement', 'good first issue'], 'easy', {
    problem: 'Changing the display or body font name in the Theme tab keeps the preset stylesheet, so the new family does not load.',
    outcome: 'The Google Fonts URL is rebuilt from the chosen families and weights.',
    context: '`theme.fonts.googleFontsHref` is set by presets in `src/generator/presets.ts`. Build it from `display`, `body` and `displayWeight` in `src/render/html.ts` instead, and URL-encode family names.',
    criteria: ['Changing a font updates the canvas', 'Family names are encoded safely', 'Unit test for the URL builder'],
  }),
  issue('Select and animate individual elements inside a section', ['frontend', 'animation', 'enhancement'], 'hard', {
    problem: 'Selection and animation work per section. The brief asks for independent animations on headings, images, buttons and cards.',
    outcome: 'Clicking an element on the canvas selects it; the Animation tab can attach a reveal to that element only.',
    context: 'Elements need stable ids in the model (for example per content field and per item). The canvas selection script in `renderPage` posts messages to the editor. Needs a schema change and migration; please discuss the model shape in the issue first.',
    criteria: ['Design agreed in the issue before implementation', 'Element ids are stable across edits', 'Section-level animations keep working', 'Tests for the model and renderer'],
  }),
  issue('Parallax: scroll start and end positions', ['parallax', 'animation-engine', 'enhancement'], 'medium', {
    problem: 'Parallax movement is centred on the viewport midpoint; designers cannot choose where the movement starts and ends.',
    outcome: 'Two new settings (start and end, as a fraction of viewport height) that bound the movement range.',
    context: '`updateParallax` in `src/runtime/engine.js` computes `progress`. Add the settings to `parallaxSettingsSchema` with defaults that keep current behaviour, and sliders in `ParallaxDesigner`.',
    criteria: ['Default behaviour unchanged (existing runtime tests pass)', 'New runtime test with a bounded range', 'Controls in the Parallax designer'],
  }),
  issue('Parallax: drag to reorder layers', ['parallax', 'ui-ux', 'enhancement', 'good first issue'], 'easy', {
    problem: 'Parallax layers can only move up one step at a time with an "Up" button.',
    outcome: 'Layers can be reordered by drag and drop and with keyboard (up and down buttons).',
    context: '`ParallaxDesigner` in `src/editor/panels/AnimationPanel.tsx`. The section list in `Editor.tsx` shows an existing drag-and-drop pattern.',
    criteria: ['Drag and drop works', 'Keyboard alternative exists', 'Order is reflected in rendered z-order'],
  }),
  issue('Scroll reveal: stagger direction and random order', ['scroll-reveal', 'animation-engine', 'enhancement', 'good first issue'], 'easy', {
    problem: 'Staggered children always animate first to last.',
    outcome: 'A `staggerFrom` setting: start, end, centre, or a deterministic shuffle.',
    context: '`initReveal` in `src/runtime/engine.js` sets `--dw-rv-delay` per target index. Any shuffle must be seeded (deterministic) so previews and exports match.',
    criteria: ['New setting in schema and Reveal designer', 'Runtime tests for each order', 'Deterministic output'],
  }),
  issue('Horizontal scroll: keyboard and screen reader support', ['horizontal-scroll', 'accessibility', 'enhancement'], 'medium', {
    problem: 'A pinned horizontal gallery is driven only by vertical scrolling. Keyboard users tabbing into panels may not see the focused panel.',
    outcome: 'Focusing an element in a panel scrolls the page so that panel is visible; indicators get accessible names.',
    context: '`initHorizontal` and `updateHorizontal` in `src/runtime/engine.js`. Use a single `focusin` listener on the section and compute the scroll target from the panel index.',
    criteria: ['Tabbing through panels keeps the focused panel on screen', 'Listener removed in `destroy()`', 'Runtime test with a jsdom focus event'],
  }),
  issue('Horizontal scroll: clickable panel indicators', ['horizontal-scroll', 'ui-ux', 'enhancement'], 'medium', {
    problem: 'Panel indicators are decorative dots.',
    outcome: 'Indicators become buttons that scroll to their panel.',
    context: 'Renderer emits `.dw-h-dots i` in `src/render/html.ts`; the runtime toggles `.on`. Reuse the snap scroll calculation in `snap()`.',
    criteria: ['Indicators are buttons with labels like "Panel 2 of 5"', 'Hidden when `showIndicators` is false', 'Respects reduced motion (instant scroll)'],
  }),
  issue('Honour showProgress and showIndicators settings in the renderer', ['horizontal-scroll', 'bug', 'good first issue'], 'easy', {
    problem: 'The Horizontal designer has "Progress bar" and "Panel indicators" toggles, but the renderer always outputs both.',
    outcome: 'Turning a toggle off removes that element from the canvas and export.',
    context: 'Gallery branch of `sectionBody` in `src/render/html.ts`.',
    criteria: ['Both toggles work', 'Renderer tests for on and off'],
  }),
  issue('Editor: edit text directly on the canvas', ['frontend', 'ui-ux', 'enhancement'], 'hard', {
    problem: 'Text can only be edited in the Content tab.',
    outcome: 'Double-clicking a heading or paragraph on the canvas edits it in place; changes become `updateContent` commands.',
    context: 'The canvas is a sandboxed iframe without same-origin access, so it must communicate by `postMessage` (see the selection script in `renderPage`). Never trust messages without checking `source` and shape.',
    criteria: ['Edits produce commands and support undo', 'Message handling validates input', 'Works with keyboard (Enter to save, Escape to cancel)'],
  }),
  issue('Editor: incremental canvas updates instead of full reloads', ['frontend', 'performance', 'enhancement'], 'hard', {
    problem: 'Every change re-renders the whole iframe document, which restarts animations and will get slow on long pages.',
    outcome: 'Style and content changes patch only the affected section in the live canvas.',
    context: '`Editor.tsx` passes `srcDoc` from `renderPage`. `renderSection` can render one section; send it via `postMessage` and swap the node, then re-init the runtime for that section.',
    criteria: ['Typing in a field no longer reloads the canvas', 'Runtime has a per-section re-init with cleanup', 'Measured before and after on a 20-section page'],
  }),
  issue('Assets panel with image upload', ['frontend', 'enhancement', 'help wanted'], 'medium', {
    problem: 'Images can only be added as https URLs.',
    outcome: 'An Assets panel in the left sidebar to upload, list and pick images.',
    context: 'localStorage is too small for images. Use IndexedDB for blobs and reference assets by id in the model; export must inline or bundle them. Discuss the storage design in the issue first.',
    criteria: ['Upload, list, delete and pick images', 'Size limit with a clear error', 'Export includes the images'],
  }),
  issue('Multi-page export as a ZIP', ['frontend', 'enhancement'], 'medium', {
    problem: 'Export produces a single HTML file and only for the first page.',
    outcome: 'Export writes one HTML file per page plus shared CSS and runtime files, packaged as a ZIP.',
    context: '`renderPage` already takes a `pageId`. Split the inlined CSS and runtime into files in `src/editor/exportSite.ts`. Pick a small, maintained ZIP library or write a store-only ZIP writer.',
    criteria: ['ZIP opens and works offline (except web fonts)', 'Links between pages work', 'Test that checks the file list'],
  }),
  issue('End-to-end tests with Playwright', ['testing', 'enhancement', 'help wanted'], 'medium', {
    problem: 'Tests cover the model, renderer and runtime but not the editor in a real browser.',
    outcome: 'Playwright tests for: create a project, select a section, change a property, add an animation, reload and see it saved, export HTML.',
    context: 'Add `@playwright/test`, a `test:e2e` script and a CI job. The canvas iframe is sandboxed; use frame locators.',
    criteria: ['Runs in CI on pull requests without secrets', 'Covers the flow above at desktop and mobile widths'],
  }),
  issue('Visual regression screenshots for presets', ['testing', 'design'], 'medium', {
    problem: 'Design presets can break visually without any test failing.',
    outcome: 'Screenshot tests of the sample site for each preset at 390 and 1280 px.',
    context: 'Use `npm run sample` as a base; extend it to render each preset in `src/generator/presets.ts`.',
    criteria: ['One baseline per preset and width', 'Documented update procedure'],
  }),
  issue('Accessibility audit of the editor', ['accessibility', 'ui-ux', 'help wanted'], 'medium', {
    problem: 'The editor has not been audited with a screen reader or automated tooling.',
    outcome: 'An audit report with fixes for labels, focus order, live regions and contrast in light and dark mode.',
    context: 'Editor chrome lives in `src/editor/` and `src/styles.css`. Consider axe-core in the Playwright tests.',
    criteria: ['Every control has an accessible name', 'Section list is operable by keyboard alone', 'Contrast meets WCAG AA in both themes'],
  }),
  issue('Contrast check for theme colours', ['accessibility', 'design', 'enhancement', 'good first issue'], 'easy', {
    problem: 'Users can pick text and background colours with poor contrast.',
    outcome: 'The Theme tab shows the contrast ratio for text on background and text on accent, with a warning below WCAG AA.',
    context: '`ThemePanel.tsx`. Write a small pure contrast-ratio function with unit tests.',
    criteria: ['Ratio shown for both pairs', 'Warning below 4.5:1', 'Unit tests for the contrast function'],
  }),
  issue('Docs: guide to adding a new section type', ['documentation', 'good first issue'], 'easy', {
    problem: 'Adding a section type touches several files and the steps are not written down.',
    outcome: 'A `docs/adding-a-section.md` walkthrough with a worked example.',
    context: 'Files: `src/model/schema.ts` (`SECTION_TYPES` and `SECTION_VARIANTS`), `src/model/defaults.ts`, `src/render/html.ts` and `css.ts`, the planner in `src/generator/generate.ts`, editor labels in `src/editor/panels/Inspector.tsx`, tests in `tests/`. The Team, Key figures and Product showcase sections are good worked examples.',
    criteria: ['Step-by-step guide linked from CONTRIBUTING.md', 'Example compiles if copied'],
  }),
  issue('Docs: animation runtime guide for creative developers', ['documentation', 'animation'], 'easy', {
    problem: 'The runtime rules are summarised in docs/architecture.md, but there is no guide to how each effect is computed.',
    outcome: 'A `docs/animation-runtime.md` that explains the frame loop, each system\'s maths, the CSS hooks and how to add an effect.',
    context: '`src/runtime/engine.js`, `src/render/css.ts` and `tests/runtime.test.ts`.',
    criteria: ['Covers parallax, reveal and horizontal', 'Includes how to test a new effect'],
  }),
  issue('AI assistant: design the command proposal flow', ['ai-integration', 'backend', 'enhancement'], 'hard', {
    problem: 'Phase 5 needs an AI assistant that edits sites safely.',
    outcome: 'A design document and prototype where a model receives the project JSON and a request, returns a list of `Command` objects, and the editor previews them before applying.',
    context: '`applyCommand` already validates every command against the schema. API keys must stay server-side, never in the browser bundle or in CI for fork PRs. Please open a design discussion before writing code.',
    criteria: ['Design doc agreed in the issue', 'Commands are validated and shown as a diff before applying', 'No secrets in client code or fork CI'],
  }),
];
