# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- AI assistant (AI tab): describe a change in natural language; Claude (claude-opus-5-5, structured output, server-side refusal fallback) proposes Dynaweb commands that are parsed, shape-checked and applied to a copy of the project before you see them; rejected proposals show the reason; accepted ones apply as one undo step. Missing facts and needed integrations are listed, never invented. Runs server-side through the dev server; the API key is read from the server environment and never reaches the browser bundle.

### Changed

- Dynaweb is now a universal website generator (project file format version 5; older files migrate automatically). The fixed sector list (tourism, hotel, restaurant, other) is gone: the brief is free text in the owner's words (purpose, description, optional activity, colours, typography, imagery, layout, motion, functionality, technical needs). The planner suggests sections from the objective and those words only, never from an industry; the wizard lets the owner tick exactly the sections they want. Art direction ranks presets by atmosphere and the owner's colour words. Structured data uses the schema.org type the owner chooses (Organization by default). New objectives: community, portfolio, other. New atmospheres: playful, technical.

### Added

- Universal building blocks: Text (long-form paragraphs), Image or video (https .mp4/.webm, or YouTube and Vimeo embeds with privacy-friendly hosts) and Custom section (heading, text, media, buttons and items together, for anything else).
- Element-level animation (project file format version 4, older files migrate automatically): click a heading, text, image, button or card on the canvas and give it its own scroll reveal. Element keys are stable (content fields by name, items by id), the element's reveal overrides the section reveal so effects never stack, and item animations follow their item when it is removed or its section duplicated.
- Section types Team, Key figures (statistics) and Product showcase, each with two layouts. Figures, names and products start as placeholders: Dynaweb never invents numbers or people. The planner adds a showcase for sales sites, a team section when the brief mentions people, and key figures for lead generation or when asked.
- Layout variants (project file format version 3, older files keep their look): 2 to 4 layouts per section type, such as split, full-bleed and editorial heroes, numbered or featured-first service lists, masonry and filmstrip galleries, spotlight testimonials. Each preset composes pages with its own layouts, and the Style tab has a layout picker.
- Brief engine (project file format version 2, older files migrate automatically): sector, location, visual atmosphere, primary objective, languages, visual references and public address.
- Art direction step: three design proposals ranked against the brief, each with its own character and reasoning, plus the shared layout, imagery, spacing and motion direction. Six presets (new: Quarry, Canopy).
- Structure planner: sections chosen from sector and objective; new section types Services, Testimonials, Pricing and Contact. Placeholders only, never invented reviews or prices.
- Working contact and booking forms: real-time validation, real submission to an https endpoint, honest "not connected" state, spam honeypot, booking requests never shown as confirmed.
- Micro-interactions: magnetic buttons (mouse only) and card hover, with reduced-motion fallbacks.
- SEO: Open Graph, canonical URL, JSON-LD built only from entered facts, sitemap.xml and robots.txt downloads.
- Site tab in the editor and a "Copy AI prompt" action that fills the Dynaweb master prompt with the brief.
- Unique section anchors (duplicated sections no longer share an id).

- Structured site model (projects, pages, sections, animations) with Zod validation and a versioned, migratable project store.
- Command-based editing: every change is validated and immutable, with undo and redo.
- Creation wizard: project facts, design brief, four original design presets, animation intensity.
- Visual editor: section list with drag-and-drop ordering, section library, sandboxed live canvas with click-to-select, desktop/tablet/mobile preview, zoom, and inspector tabs for content, style, animation and theme.
- Animation runtime with no dependencies:
  - **Parallax**: background and extra layers, depth, direction, scale, perspective and mouse interaction.
  - **Scroll reveal**: 12 effects, 6 target groups, duration, delay, stagger, easing, distance, initial opacity, scale and rotation, play-once or replay, and a timeline view.
  - **Horizontal scroll**: pinned section, panel width, gap, speed, direction, snapping, progress bar, indicators, and a vertical or swipe layout on mobile.
- Reduced-motion support and content that stays visible without JavaScript.
- Export to a single standalone HTML file, plus project save and load as JSON.
- Contributor documentation, issue and pull request templates, CI, and Dependabot.

[Unreleased]: https://github.com/JOKAIR99/Dynaweb/commits/main
