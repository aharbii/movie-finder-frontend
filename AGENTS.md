# OpenAI Codex CLI — frontend submodule

This is **`movie-finder-frontend`** (`frontend/`) — part of the Movie Finder project.
GitHub repo: `aharbii/movie-finder-frontend` · Parent repo: `aharbii/movie-finder`

> See root AGENTS.md for: full submodule map, GitHub issue/PR hygiene, coding standards, branching strategy, session start protocol.

---

## What this submodule does

Angular 21 SPA — user interface for Movie Finder.

- **Streaming:** candidate movies via SSE (`EventSource`)
- **Serving:** nginx + runtime env injection via `docker-entrypoint.sh`

---

## Technology stack

- Angular 21, TypeScript 5.9
- **Signals** for reactive state
- **Vitest** for testing
- **ESLint 9** + **Prettier**

---

## Design patterns

- **Smart / Dumb components:** Smart components own services; dumb components take `@Input()` only.
- **Facade service:** Services wrap `HttpClient` and `EventSource`.
- **Signal-based state:** Avoid `BehaviorSubject` for local state.
- **Runtime config:** Injected via `docker-entrypoint.sh`.

---

## Common tasks

```bash
npm ci
npm start
npm test
npm run lint / npm run format
```

---

## VS Code setup

`frontend/.vscode/` — full workspace configuration for the Angular SPA.

- `settings.json`: Prettier format-on-save, ESLint 9 flat config, Vitest, TypeScript strict, ruler 120
- `extensions.json`: `angular.ng-template`, `esbenp.prettier-vscode`, `dbaeumer.vscode-eslint`, `vitest.explorer`, GitLens, Docker
- `launch.json`: Chrome debugger for `ng serve` (localhost:4200)
- `tasks.json`: `npm: start` and `npm: test` background tasks

---

## Workflow invariants (frontend-specific)

- Gitlink path is `frontend` inside `aharbii/movie-finder`. Parent path filters must use `frontend`, not `frontend/**`.
- SSE event field renames originating in `chain/` are breaking changes for this repo — coordinate before merging.

### Submodule pointer bump

```bash
# in root movie-finder
git add frontend && git commit -m "chore(frontend): bump to latest main"
```
