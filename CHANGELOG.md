# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
