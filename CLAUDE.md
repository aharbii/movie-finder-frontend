# Claude Code — frontend submodule

This is **`movie-finder-frontend`** (`frontend/`) — part of the Movie Finder project.
GitHub repo: `aharbii/movie-finder-frontend` · Parent repo: `aharbii/movie-finder`

> See root `CLAUDE.md` for: full submodule map, GitHub issue/PR hygiene, cross-cutting checklist, coding standards, branching strategy, session start protocol.

---

## What this submodule does

Angular 21 SPA — the user interface for Movie Finder.

- Users type a natural-language description of a half-remembered film
- Candidates stream in via **SSE** (`EventSource`) from the FastAPI backend
- User confirms a match → follow-up Q&A in a chat interface
- **nginx** serves the production build and reverse-proxies API calls
- **Runtime env injection** via `docker-entrypoint.sh` — no build-time secrets baked in

### Key files

```
src/                   Angular application source
angular.json           Build and test configuration
tsconfig.json          TypeScript 5.9 strict config
eslint.config.js       ESLint 9 flat config
proxy.conf.js          Dev server proxy → backend
nginx.conf.template    Production nginx config (env-var substituted at runtime)
docker-entrypoint.sh   Injects runtime env into the built app at container start
Dockerfile             Multi-stage: node builder → nginx runtime
Jenkinsfile            CI/CD pipeline
```

---

## Technology stack (frontend-specific)

| Layer           | Stack                                                                 |
| --------------- | --------------------------------------------------------------------- |
| Framework       | Angular 21, TypeScript 5.9                                            |
| Components      | Standalone (no NgModules)                                             |
| Reactive state  | Angular Signals                                                       |
| Streaming       | `EventSource` (SSE)                                                   |
| HTTP            | Angular `HttpClient` (wrapped in facade services)                     |
| Serving         | nginx (production)                                                    |
| Package manager | `npm`                                                                 |
| Linting         | ESLint 9 flat config                                                  |
| Formatting      | Prettier                                                              |
| Tests           | Vitest                                                                |
| CI              | Jenkins Multibranch → Azure Container Registry → Azure Container Apps |

---

## Design patterns (frontend-specific)

| Pattern                      | Where                  | Rule                                                                                                                                                             |
| ---------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Smart / Dumb components**  | All Angular components | Smart components own services and state; dumb (presentational) components receive `@Input()` only and emit `@Output()`. No service injection in dumb components. |
| **Facade service**           | HTTP / SSE layer       | Services wrap `HttpClient` and `EventSource`, returning typed observables or signals. Components never call `HttpClient` or `EventSource` directly.              |
| **Signal-based state**       | Reactive state         | Use Angular Signals for component-local and shared state. Avoid `BehaviorSubject` for component-local state.                                                     |
| **Immutability**             | State updates          | State objects are not mutated — compute new values and reassign signals.                                                                                         |
| **Runtime config injection** | Docker / nginx         | Environment-specific config (API URL, feature flags) is injected at container start via `docker-entrypoint.sh`, not baked into the build.                        |

---

## Coding standards (additions to root CLAUDE.md)

- **Standalone components only** — no NgModules ever
- **Signals for state** — `BehaviorSubject` is acceptable for cross-component streams, but not for component-local state
- **API response types must be defined** — no raw `any` from HTTP calls
- `readonly` wherever possible — signal inputs, injected services, model interfaces
- Run `npm run lint` and `npm run format` before committing

---

## Pre-commit hooks

`frontend/.pre-commit-config.yaml` uses local node hooks — `node_modules` must exist first.

```bash
npm ci && pre-commit install
pre-commit run --all-files
```

Hooks: whitespace/file health, `detect-secrets` (excludes `package-lock.json`), `eslint` (`--max-warnings=0`), `prettier --check`. **Never `--no-verify`.**

---

## VSCode setup

- `settings.json` — Prettier format-on-save, ESLint 9, Vitest, TypeScript strict
- `extensions.json` — `angular.ng-template`, `esbenp.prettier-vscode`, `dbaeumer.vscode-eslint`, GitLens, Docker
- `launch.json` — Chrome debugger for `ng serve` (localhost:4200) and `ng test`
- `tasks.json` — `npm: start` and `npm: test` background tasks

**Format on save:** Prettier handles `.ts`, `.html`, `.scss`. **Linting:** `npm run lint`.

---

## Workflow invariants (frontend-specific)

- Gitlink path is `frontend` inside `aharbii/movie-finder`. Parent path filters must use `frontend`, not `frontend/**`.
- SSE event field renames originating in `chain/` are breaking changes for this repo — coordinate before merging.

Run `/session-start` in root workspace.

---

## Branching and commits

```
feature/<kebab>  fix/<kebab>  chore/<kebab>  docs/<kebab>
```

Conventional Commits: `feat(ui): add SSE reconnect with exponential backoff`

---

## Cross-cutting change checklist (frontend-specific rows)

| #   | Category           | Key gate                                                                                                                                                                                      |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Branch**         | `feature/fix/chore/docs` in this repo + pointer-bump `chore/` in root `movie-finder`                                                                                                          |
| 2   | **ADR**            | New framework, state management strategy change, or breaking SSE protocol change → ADR in `docs/`                                                                                             |
| 3   | **Env & secrets**  | `nginx.conf.template` + `docker-entrypoint.sh` updated for new routes/env; `.env.example` updated; new secrets → Key Vault + Jenkins                                                          |
| 4   | **Docker**         | `Dockerfile` + `docker-compose.yml` updated for new build args/env/ports                                                                                                                      |
| 5   | **Diagrams**       | `06-frontend-architecture.puml`; `07-seq-authentication.puml` or `08-seq-chat-sse.puml` for flow changes; `workspace.dsl` if C4 changed; commit to `docs/` first; **never `.mdj`**            |

### Sibling submodules affected

| Submodule         | Why                                                                       |
| ----------------- | ------------------------------------------------------------------------- |
| `backend/app/`    | API contract — new endpoints, changed SSE event fields, auth flow changes |
| `backend/chain/`  | SSE event shape originates here                                           |
| `infrastructure/` | New Azure Container App config, env vars                                  |
| `docs/`           | UI screenshots, user guide, architecture                                  |

### Submodule pointer bump

```bash
# in root movie-finder
git add frontend && git commit -m "chore(frontend): bump to latest main"
```

### Pull request

- [ ] PR in `aharbii/movie-finder-frontend` discloses the AI authoring tool + model
- [ ] PR in `aharbii/movie-finder` (pointer bump)
- [ ] Any AI-assisted review comment or approval discloses the review tool + model
