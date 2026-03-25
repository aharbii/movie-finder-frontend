# Gemini CLI — frontend submodule

Foundational mandate for `movie-finder-frontend` (`frontend/`).

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

## Coding standards
- TypeScript **strict mode** on.
- No `any` — use `unknown` or proper interfaces.
- **Standalone components** only.
- No `console.log` in production.
- Vitest tests for every component/service.

---

## Common tasks
- `npm ci`
- `npm start`
- `npm test`
- `npm run lint` / `npm run format`

---

## VSCode setup

`frontend/.vscode/` — full workspace configuration for the Angular SPA.
- `settings.json`: Prettier format-on-save, ESLint 9 flat config, Vitest, TypeScript strict, ruler 120
- `extensions.json`: `angular.ng-template`, `esbenp.prettier-vscode`, `dbaeumer.vscode-eslint`, `vitest.explorer`, GitLens, Docker
- `launch.json`: Chrome debugger for `ng serve` (localhost:4200)
- `tasks.json`: `npm: start` and `npm: test` background tasks
- Modifying configs: keep parity with root `.vscode/` frontend tasks. Update `CLAUDE.md`,
  `GEMINI.md`, `AGENTS.md`, and the repo's `.github/copilot-instructions.md` after.
