# Claude Code — frontend submodule

This is **`movie-finder-frontend`** (`frontend/`) — part of the Movie Finder project.
GitHub repo: `aharbii/movie-finder-frontend` · Parent repo: `aharbii/movie-finder`

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

## Full project context

### Submodule map

| Path | GitHub repo | Role |
|---|---|---|
| `.` (root) | `aharbii/movie-finder` | Parent — all cross-repo issues |
| `backend/` | `aharbii/movie-finder-backend` | FastAPI + uv workspace root |
| `backend/app/` | (nested in backend) | FastAPI application layer |
| `backend/chain/` | `aharbii/movie-finder-chain` | LangGraph AI pipeline |
| `backend/chain/imdbapi/` | `aharbii/imdbapi-client` | Async IMDb REST client |
| `backend/rag_ingestion/` | `aharbii/movie-finder-rag` | Offline embedding ingestion |
| `frontend/` | `aharbii/movie-finder-frontend` | **← you are here** |
| `docs/` | `aharbii/movie-finder-docs` | MkDocs documentation |
| `infrastructure/` | `aharbii/movie-finder-infrastructure` | IaC / Azure provisioning |

### Technology stack

| Layer | Stack |
|---|---|
| Framework | Angular 21, TypeScript 5.9 |
| Components | Standalone (no NgModules) |
| Reactive state | Angular Signals |
| Streaming | `EventSource` (SSE) |
| HTTP | Angular `HttpClient` (wrapped in facade services) |
| Serving | nginx (production) |
| Package manager | `npm` |
| Linting | ESLint 9 flat config |
| Formatting | Prettier |
| Tests | Vitest |
| CI | Jenkins Multibranch → Azure Container Registry → Azure Container Apps |

---

## Design patterns to follow

| Pattern | Where | Rule |
|---|---|---|
| **Smart / Dumb components** | All Angular components | Smart components own services and state; dumb (presentational) components receive `@Input()` only and emit `@Output()`. No service injection in dumb components. |
| **Facade service** | HTTP / SSE layer | Services wrap `HttpClient` and `EventSource`, returning typed observables or signals. Components never call `HttpClient` or `EventSource` directly. |
| **Signal-based state** | Reactive state | Use Angular Signals for component-local and shared state. Avoid `BehaviorSubject` for component-local state. |
| **Immutability** | State updates | State objects are not mutated — compute new values and reassign signals. |
| **Runtime config injection** | Docker / nginx | Environment-specific config (API URL, feature flags) is injected at container start via `docker-entrypoint.sh`, not baked into the build. |

---

## Coding standards

- **TypeScript strict mode** — `noImplicitAny`, `strictNullChecks` enabled in `tsconfig.json`
- **No `any`** — use `unknown` + type narrowing, or define a proper interface
- **Standalone components only** — no NgModules
- **Signals for state** — `BehaviorSubject` is acceptable for cross-component streams, but not for local component state
- **No `console.log`** left in production code
- **ESLint 9 + Prettier** must pass before commit — run `npm run lint` and `npm run format`
- **Tests with Vitest** — every component and service needs at least a basic test
- `readonly` wherever possible — signal inputs, injected services, model interfaces
- API response types must be defined — no raw `any` from HTTP calls

---

## VSCode setup

`frontend/.vscode/` is committed with a full workspace configuration:
- `settings.json` — Prettier format-on-save, ESLint 9, Vitest, TypeScript strict
- `extensions.json` — `angular.ng-template`, `esbenp.prettier-vscode`, `dbaeumer.vscode-eslint`, GitLens, Docker
- `launch.json` — Chrome debugger for `ng serve` (localhost:4200) and `ng test`
- `tasks.json` — `npm: start` and `npm: test` background tasks

**Format on save:** Prettier handles `.ts`, `.html`, `.scss`
**Linting:** ESLint 9 flat config (`eslint.config.js`) — `npm run lint`

---

## Pre-commit hooks

`frontend/.pre-commit-config.yaml` uses **local node hooks** — no Python toolchain needed.

```bash
# Prerequisite: node_modules must exist
npm ci

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

| Hook | What it checks |
|---|---|
| `trailing-whitespace`, `end-of-file-fixer`, `check-yaml`, `check-merge-conflict` | File health |
| `detect-private-key`, `detect-secrets` | Secrets (excludes `package-lock.json`) |
| `eslint-frontend` | TS + HTML via `node_modules/.bin/eslint --max-warnings=0` |
| `prettier-frontend` | Format check via `node_modules/.bin/prettier --check` |

**Never `--no-verify`.** False-positive secret → `# pragma: allowlist secret` + update `.secrets.baseline`.

---

## Workflow invariants

- This repo is the gitlink path `frontend` inside `aharbii/movie-finder`. Parent
  workflow/path filters must use `frontend`, not `frontend/**`.
- Cross-repo tracker issues originate in `aharbii/movie-finder`. Create the linked child issue in
  this repo only if this repo will actually change.
- Inspect `.github/ISSUE_TEMPLATE/*.yml`, `.github/PULL_REQUEST_TEMPLATE.md` when present, and a
  recent example before creating or editing issues/PRs. Do not improvise titles or bodies.
- For child issues in this repo, use `.github/ISSUE_TEMPLATE/linked_task.yml` and keep the
  description, file references, and acceptance criteria repo-specific.
- If CI, required checks, or merge policy changes affect this repo, update contributor-facing docs
  here and in `aharbii/movie-finder` where relevant.
- If a new standalone issue appears mid-session, branch from `main` unless stacking is explicitly
  requested.
- PR descriptions must disclose the AI authoring tool + model. Any AI-assisted review comment or
  approval must also disclose the review tool + model.

---

## Session start protocol

1. `gh issue list --repo aharbii/movie-finder --state open`
2. Inspect `.github/ISSUE_TEMPLATE/*.yml`, `.github/PULL_REQUEST_TEMPLATE.md` when present, and a
   recent example of the same type
3. Create the parent issue in `aharbii/movie-finder`, then the linked child issue in
   `aharbii/movie-finder-frontend` only if this repo will actually change
4. Create a branch from `main` and work through the checklist

---

## Branching and commits

```
feature/<kebab>  fix/<kebab>  chore/<kebab>  docs/<kebab>
```

Conventional Commits: `feat(ui): add SSE reconnect with exponential backoff`

---

## Cross-cutting change checklist

Full detail in `ai-context/issue-agent-briefing-template.md`.

| # | Category | Key gate |
|---|---|---|
| 1 | **Issues** | Parent `aharbii/movie-finder` + child here only if this repo changes; templates inspected |
| 2 | **Branch** | `feature/fix/chore/docs` in this repo + pointer-bump `chore/` in root `movie-finder` |
| 3 | **ADR** | New framework, state management strategy change, or breaking SSE protocol change → ADR in `docs/` |
| 4 | **Implementation** | Smart/Dumb boundary respected; no direct `HttpClient`/`EventSource` in components; TypeScript strict; `npm run lint` + `npm run format` pass; `npm test` passes; proxy still routes correctly |
| 5 | **Env & secrets** | `nginx.conf.template` + `docker-entrypoint.sh` updated for new routes/env; `.env.example` updated; new secrets → Key Vault + Jenkins |
| 6 | **Docker** | `Dockerfile` + `docker-compose.yml` updated for new build args/env/ports |
| 7 | **CI** | `Jenkinsfile` / `.github/workflows/` reviewed |
| 8 | **Diagrams** | `06-frontend-architecture.puml`; `07-seq-authentication.puml` or `08-seq-chat-sse.puml` for flow changes; `workspace.dsl` if C4 changed; commit to `docs/` first; **never `.mdj`** |
| 8a | **Docs** | `docs/` pages (UI guide, SSE integration); `README.md` + `CHANGELOG.md` updated |

### 10. Sibling submodules affected
| Submodule | Why |
|---|---|
| `backend/app/` | API contract — new endpoints, changed SSE event fields, auth flow changes |
| `backend/chain/` | SSE event shape originates here |
| `infrastructure/` | New Azure Container App config, env vars |
| `docs/` | UI screenshots, user guide, architecture |

### 11. Submodule pointer bump
```bash
# in root movie-finder
git add frontend && git commit -m "chore(frontend): bump to latest main"
```

### 12. Pull request
- [ ] PR in `aharbii/movie-finder-frontend` discloses the AI authoring tool + model
- [ ] PR in `aharbii/movie-finder` (pointer bump)
- [ ] Any AI-assisted review comment or approval discloses the review tool + model
