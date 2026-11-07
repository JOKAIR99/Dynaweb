# Contributing to Dynaweb Studio

Thank you for helping build Dynaweb. You do not need write access to this repository: every contribution goes through a fork and a pull request, and the maintainer reviews it.

New here? Look for issues labelled [`good first issue`](https://github.com/JOKAIR99/Dynaweb/labels/good%20first%20issue) or [`help wanted`](https://github.com/JOKAIR99/Dynaweb/labels/help%20wanted), and comment on the issue to say you are taking it so nobody duplicates your work.

## 1. Set up your environment

You need **Node.js 20 or newer** (CI uses Node 22) and Git.

```bash
# 1. Fork https://github.com/JOKAIR99/Dynaweb on GitHub, then clone your fork
git clone https://github.com/<your-username>/Dynaweb.git
cd Dynaweb

# 2. Track the main repository so you can stay up to date
git remote add upstream https://github.com/JOKAIR99/Dynaweb.git

# 3. Install dependencies
npm ci
```

No API keys or environment variables are needed to run, test or build the project today.

## 2. Run the app and the checks

| Command | What it does |
|---|---|
| `npm run dev` | Starts the editor at http://localhost:5173 |
| `npm test` | Runs the Vitest suite (model, storage, renderer, animation runtime) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run build` | Production build into `dist/` |
| `npm run check` | All of the above in the order CI runs them |

## 3. Make a change

```bash
git fetch upstream
git checkout -b feat/short-description upstream/main
```

Branch names: `feat/...`, `fix/...`, `docs/...`, `test/...`, `perf/...`, `refactor/...`.

Before you write code, read [`docs/architecture.md`](docs/architecture.md). The three rules that matter most:

1. **The site model is the source of truth.** Generated HTML is always derived from `src/model/schema.ts`. If your feature stores something, it goes in the schema, with validation.
2. **Every edit is a command.** UI changes call `dispatch(command)`; `applyCommand` in `src/model/commands.ts` is the only code that changes a project. Add a command (with tests) rather than editing project data directly.
3. **The animation runtime keeps its rules.** `src/runtime/engine.js` ships inside every exported site: no dependencies, content visible without JavaScript, a reduced-motion fallback, only `transform`/`opacity`/`filter`/`clip-path` animated, and full cleanup in `destroy()`.

Also:

- Never put invented business facts (addresses, prices, reviews, testimonials) into generated content. Use `[placeholders]`.
- Escape all user text in the renderer and pass URLs through `safeHref` / `safeImage`.
- Keep changes focused: one issue, one pull request. Unrelated refactors go in their own PR.
- Add or update tests for any behaviour you change. UI and animation work also needs a browser check at desktop and mobile widths.

## 4. Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add stagger direction to scroll reveal
fix: stop horizontal scroll from jumping on resize
docs: explain parallax layer speeds
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`.

## 5. Open a pull request

```bash
npm run check
git push origin feat/short-description
```

Then open a pull request from your branch against **`JOKAIR99/Dynaweb` `main`** and fill in the template. Link the issue with `Closes #123`.

## 6. Review

- CI runs lint, typecheck, tests, build, a dependency audit and a dependency review on every pull request. Workflows run with read-only permissions and no secrets, so fork PRs are safe to run. A first-time contributor's workflows may wait for the maintainer to approve them.
- [`CODEOWNERS`](.github/CODEOWNERS) requests a review from the maintainer (@JOKAIR99) automatically.
- Expect a first response within about a week. Reviews may ask for changes; push more commits to the same branch to update the PR.
- Only maintainers merge, and only after CI passes and a review approves. Nothing is merged automatically. Pull requests are squash-merged, so the PR title becomes the commit message.

## 7. Releases

- Versions follow [Semantic Versioning](https://semver.org/). While the version is `0.x`, minor versions may contain breaking changes to the project file format; those always come with a migration in `src/storage/projectStore.ts`.
- Every user-visible change is recorded in [`CHANGELOG.md`](CHANGELOG.md) under **Unreleased**. Add your entry in your pull request.
- The maintainer cuts a release by moving the Unreleased entries under a version heading, tagging `vX.Y.Z` on `main` and publishing a GitHub Release.

## Contribution areas

| Area | Labels | Where to look |
|---|---|---|
| Frontend development | `frontend` | `src/editor/` |
| Backend development | `backend` | Not started: publishing and AI service (Phases 5 and 6) |
| AI integration | `ai-integration` | Command contract in `src/model/commands.ts` |
| UI/UX design | `design`, `ui-ux` | `src/styles.css`, `src/generator/presets.ts` |
| Animation engineering | `animation`, `animation-engine` | `src/runtime/engine.js` |
| Parallax effects | `parallax` | runtime `initParallax` / `updateParallax`, `AnimationPanel.tsx` |
| Scroll reveal effects | `scroll-reveal` | runtime `initReveal`, `revealVars` |
| Horizontal scroll | `horizontal-scroll` | runtime `initHorizontal`, `render/css.ts` |
| Templates and components | `templates` | `src/model/defaults.ts`, `src/render/html.ts` |
| Documentation | `documentation` | `README.md`, `docs/` |
| Testing and QA | `testing` | `tests/` |
| Performance | `performance` | runtime frame loop, canvas re-rendering |
| Accessibility | `accessibility` | editor controls and generated markup |

## Questions

Use [GitHub Discussions](https://github.com/JOKAIR99/Dynaweb/discussions) for questions and ideas. Report security issues privately: see [`SECURITY.md`](SECURITY.md).

By contributing you agree that your work is licensed under the project's [MIT License](LICENSE) and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
