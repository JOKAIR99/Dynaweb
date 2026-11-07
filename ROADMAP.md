# Roadmap

Dynaweb Studio is built in phases. Each phase ends with a working, tested slice rather than a set of half-finished features. Details and design rules are in [`docs/architecture.md`](docs/architecture.md).

| Phase | Goal | Status |
|---|---|---|
| 0. Audit | Understand the starting point, choose the stack | Done |
| 1. Foundation | Site model, persistence, main interface | Done |
| 2. Visual editor | Canvas, sidebars, selection, properties, responsive preview | Mostly done |
| 3. Design engine | Design systems, section library, layout variants | Started |
| 4. Animation engine | Parallax, scroll reveal, horizontal scroll | Working, being extended |
| 5. AI integration | AI assistant that proposes commands to the site model | Not started |
| 6. Export and publishing | Multi-page export with assets, hosting | Single-file export done |
| 7. Quality assurance | End-to-end tests, accessibility audit, release | Not started |

## Now

- Element-level selection and animation (headings, images, buttons inside a section)
- More section types: testimonials, pricing, statistics, team, FAQ, services, product showcase
- Layout variants per section type, so two sites with the same sections look different
- Custom font loading for any Google Fonts family

## Next

- AI design assistant: brief to design proposals; natural-language edits turned into validated commands
- Multi-page sites with navigation
- Assets panel with local image upload
- ZIP export with pages, assets and fonts

## Later

- Publishing to static hosts
- Collaboration and cloud project storage
- A Claude connector (MCP server) so Claude can create and edit Dynaweb projects

Want to help with any of these? See [`CONTRIBUTING.md`](CONTRIBUTING.md) and the issues labelled `help wanted`.
