# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
