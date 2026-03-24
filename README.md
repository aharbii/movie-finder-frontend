# Movie Finder — Frontend

Angular 21 SPA for the Movie Finder application. Communicates with the FastAPI backend via REST + SSE streaming.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| npm | 11+ | bundled with Node 20 |
| Angular CLI | 21+ | installed via `npm ci` |

## Quick start

```bash
# From the repo root — start the full stack (backend + frontend + postgres)
cd ../ && docker compose up

# Or run the frontend in isolation against a local backend
cd frontend
npm ci
npm start          # http://localhost:4200  (proxies /api → localhost:8000)
```

## Available scripts

| Script | What it does |
|--------|-------------|
| `npm start` | Dev server with hot-reload on `http://localhost:4200` |
| `npm run build` | Production build → `dist/` |
| `npm test` | Unit tests in watch mode (Vitest) |
| `npm run test:ci` | Unit tests, single run with LCOV + Cobertura coverage → `coverage/` |
| `npm run typecheck` | TypeScript type-check without emitting (`tsc --noEmit`) |
| `npm run lint` | ESLint on all `.ts` and `.html` files |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier — reformat all source files |
| `npm run format:check` | Prettier — check formatting only (used in CI) |

## Code quality

### Linting (ESLint 9 + angular-eslint 19)

Uses the [ESLint flat config](eslint.config.js) with:
- `typescript-eslint` recommended + stylistic rules
- `@angular-eslint` component/directive conventions
- `@angular-eslint/template` HTML template rules

```bash
npm run lint          # check
npm run lint:fix      # auto-fix
```

### Formatting (Prettier 3)

Config: [.prettierrc](.prettierrc)

```bash
npm run format        # write
npm run format:check  # check only (CI)
```

### Type checking

```bash
npm run typecheck
```

### Tests + coverage

Tests are written with `@angular/core/testing` + [Vitest](https://vitest.dev/). Coverage is provided by `@vitest/coverage-v8`.

```bash
npm test             # watch mode
npm run test:ci      # single run — coverage report written to coverage/
```

Coverage reports:
- `coverage/lcov.info` — for LCOV-compatible tools
- `coverage/cobertura-coverage.xml` — consumed by Jenkins Coverage plugin

## Project structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/          auth guard (redirect to /login)
│   │   ├── interceptors/    JWT auth interceptor
│   │   ├── models.ts        shared TypeScript interfaces
│   │   └── services/
│   │       ├── auth.service.ts   register / login / refresh / logout
│   │       └── chat.service.ts   SSE streaming, session management
│   ├── features/
│   │   ├── auth/            login + register components
│   │   └── chat/            chat UI + sub-components
│   ├── app.ts               root component
│   ├── app.config.ts        application providers
│   └── app.routes.ts        route definitions
├── environments/
│   ├── environment.ts       development (uses localhost:8000)
│   └── environment.prod.ts  production (reads API_URL from window.__env)
└── main.ts                  bootstrap
```

## Docker

The multi-stage [Dockerfile](Dockerfile) produces a minimal nginx image:

```
Stage 1 (deps)    — npm ci
Stage 2 (builder) — ng build --configuration=production
Stage 3 (runner)  — nginx:stable-alpine + Angular bundle
```

Runtime environment variables are injected at container start via [docker-entrypoint.sh](docker-entrypoint.sh), which substitutes `nginx.conf.template` placeholders:

| Variable | Default | Purpose |
|----------|---------|---------|
| `API_URL` | `` (empty) | Passed to `window.__env.API_URL` in `public/env.js` |
| `BACKEND_URL` | `http://backend:8000` | nginx upstream for `/api` proxy |

## CI/CD (Jenkins)

The [Jenkinsfile](Jenkinsfile) runs three pipeline modes:

| Mode | Trigger | Stages |
|------|---------|--------|
| CONTRIBUTION | Feature branches / PRs | Type-check → Lint → Test |
| INTEGRATION | `main` branch | + Production build → Push `:sha8` + `:latest` to ACR → (opt) Staging deploy |
| RELEASE | `v*` tags | + Push `:v1.2.3` to ACR → (opt) Production deploy |

Test results are published to Jenkins via the JUnit plugin (`VITEST_JUNIT_OUTPUT_FILE`).
Coverage is published via the Coverage plugin (Cobertura XML from `coverage/`).
