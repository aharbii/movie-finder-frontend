# GitHub Copilot — movie-finder-frontend

Angular 21 SPA for Movie Finder. Users describe a half-remembered film in natural language;
results and Q&A answers stream back via SSE (`EventSource`). Served by nginx in production.

Parent project: `aharbii/movie-finder` — all issues created there first, then linked here.

---

## Tech stack

| Layer | Stack |
|---|---|
| Framework | Angular 21, TypeScript 5.9 |
| State | Angular Signals (no BehaviorSubject for component state) |
| HTTP | `HttpClient` via facade services — components never call it directly |
| Streaming | `EventSource` (SSE) for chat responses |
| Tests | Vitest + Angular TestBed, `@vitest/coverage-v8` |
| Lint/Format | ESLint 9 flat config (`eslint.config.js`), Prettier 3 (`.prettierrc`) |
| Build | Angular CLI, `ng build` → nginx static serving |

---

## TypeScript standards

- **Strict mode**: `noImplicitAny`, `strictNullChecks` — no `any`, use `unknown` + narrowing
- **Standalone components only** — no NgModules ever
- **Signals** for all reactive state — no `BehaviorSubject` for component-local state
- **Immutability** — prefer `readonly` and `const` everywhere applicable
- No `console.log` left in production code — use proper logging service

---

## Design patterns — follow these

| Pattern | Rule |
|---|---|
| **Smart / Dumb components** | Smart components own services and state. Dumb components take `@Input()` only. |
| **Facade service** | Services wrap `HttpClient` and return typed signals/observables. Components never call `HttpClient` directly. |
| **Signal-based state** | Use Angular Signals for all reactive state. Avoid `BehaviorSubject`. |

---

## Pre-commit hooks

```bash
npm ci                        # prerequisite
pre-commit install
pre-commit run --all-files
```

Hooks: `trailing-whitespace`, `end-of-file-fixer`, `check-yaml`, `check-merge-conflict`,
`detect-private-key`, `detect-secrets` (excludes `package-lock.json`),
`eslint-frontend` (via local `node_modules/.bin/eslint`),
`prettier-frontend` (via local `node_modules/.bin/prettier`).

---

## npm scripts

```bash
npm run typecheck       # tsc --noEmit
npm run lint            # ESLint
npm run lint:fix        # ESLint --fix
npm run format          # Prettier --write
npm run format:check    # Prettier --check
npm run test:ci         # Vitest single run → coverage/ (JUnit + Cobertura XML)
```

All four checks must pass before opening a PR.

---

## Cross-cutting — check for every change

1. GitHub issue in `aharbii/movie-finder` + this repo (linked)
2. Branch: `feature/`, `fix/`, `chore/` (kebab-case)
3. ADR if Angular version, SSE contract, or auth flow changes
4. `.env.example` updated in frontend + root if new env vars
5. `Dockerfile` + nginx config updated for new routes or build changes
6. `backend/app/` assessed — API contract or SSE event shape changes affect this repo
7. PlantUML `06-frontend-architecture.puml`, `07-seq-authentication.puml`, `08-seq-chat-sse.puml` updated
8. Coverage must not regress (`npm run test:ci`)
