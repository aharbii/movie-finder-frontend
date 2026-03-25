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
| `backend/imdbapi/` | `aharbii/imdbapi-client` | Async IMDb REST client |
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

## Session start protocol

1. `gh issue list --repo aharbii/movie-finder --state open`
2. Create issue in `aharbii/movie-finder`, then `aharbii/movie-finder-frontend`
3. Create branch + work through checklist

---

## Branching and commits

```
feature/<kebab>  fix/<kebab>  chore/<kebab>  docs/<kebab>
```

Conventional Commits: `feat(ui): add SSE reconnect with exponential backoff`

---

## Cross-cutting change checklist

### 1. GitHub issues
- [ ] `aharbii/movie-finder` (parent)
- [ ] `aharbii/movie-finder-frontend` linked

### 2. Branch
- [ ] Branch in this repo + `chore/` in root `movie-finder` to bump pointer

### 3. ADR
- [ ] New framework, state management strategy change, or breaking SSE protocol change?
  → `docs/architecture/decisions/ADR-NNN-title.md`

### 4. Implementation and tests
- [ ] Smart/Dumb component boundary respected
- [ ] No `HttpClient` or `EventSource` directly in components — go through a service
- [ ] TypeScript strict — no `any`, no suppressed errors
- [ ] `npm run lint` (ESLint) + `npm run format` (Prettier) pass
- [ ] Vitest tests pass: `npm test`
- [ ] Dev proxy (`proxy.conf.js`) still routes correctly for local testing

### 5. Environment and secrets
- [ ] `nginx.conf.template` updated if new routes or proxy rules
- [ ] `docker-entrypoint.sh` updated if new runtime env vars injected
- [ ] `.env.example` (if present) and root `movie-finder` `.env.example` updated
- [ ] New config/secrets flagged for Azure Key Vault and Jenkins

### 6. Docker
- [ ] `Dockerfile` updated (new build args, nginx config, env vars)
- [ ] `docker-compose.yml` updated if port or env changed
- [ ] Root `docker-compose.yml` updated if needed

### 7. CI — Jenkins
- [ ] `Jenkinsfile` reviewed

### 8. Architecture diagrams (in `docs/` submodule)
- [ ] **PlantUML** — `06-frontend-architecture.puml` for component changes; `07-seq-authentication.puml` or `08-seq-chat-sse.puml` for flow changes
  **Never generate `.mdj`**
- [ ] **Structurizr C4** — `workspace.dsl` if frontend containers or relations changed
- [ ] Commit to `aharbii/movie-finder-docs` first

### 9. Documentation
- [ ] `docs/` pages (UI guide, SSE integration)
- [ ] `README.md` updated
- [ ] `CHANGELOG.md` under `[Unreleased]`

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
- [ ] PR in `aharbii/movie-finder-frontend`
- [ ] PR in `aharbii/movie-finder` (pointer bump)
