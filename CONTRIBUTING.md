# Contributing to Movie Finder Frontend

This guide covers the conventions for contributors working on the Angular SPA.

For cross-cutting conventions (branching, commits, PRs, releases, submodule workflow) see the [root CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Table of contents

1. [Development setup](#development-setup)
2. [Project structure](#project-structure)
3. [Code standards](#code-standards)
4. [Testing](#testing)
5. [Adding a feature](#adding-a-feature)
6. [API integration](#api-integration)
7. [Docker](#docker)
8. [CI/CD](#cicd)

---

## Development setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| npm | 11+ (bundled with Node 20) |

### First-time setup

```bash
cd frontend/
npm ci                # install pinned dependencies
npm start             # http://localhost:4200 with hot-reload
```

The dev server proxies `/auth`, `/chat`, and `/health` to `http://localhost:8000`. The backend must be running.

Start the backend (in a separate terminal):
```bash
cd backend/
make db-start && make run-dev
```

Or use the full Docker stack from the root:
```bash
docker compose up postgres backend
```

---

## Project structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts          Redirects unauthenticated users to /login
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts    Injects JWT Bearer token on every outgoing request
│   │   │   ├── models.ts                  Shared TypeScript interfaces (ChatMessage, Session, etc.)
│   │   │   └── services/
│   │   │       ├── auth.service.ts        register(), login(), refresh(), logout()
│   │   │       └── chat.service.ts        SSE streaming, session management
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login.component.ts     /login page
│   │   │   │   └── register.component.ts  /register page
│   │   │   └── chat/
│   │   │       ├── chat.component.ts      Main chat page (/chat)
│   │   │       └── components/
│   │   │           ├── candidate-cards.component.ts   Movie candidate cards (confirmation phase)
│   │   │           ├── movie-panel.component.ts        Selected movie detail panel (qa phase)
│   │   │           ├── message-bubble.component.ts     Individual chat message
│   │   │           └── session-sidebar.component.ts    Session list sidebar
│   │   ├── app.ts                         Root component
│   │   ├── app.config.ts                  Application providers
│   │   └── app.routes.ts                  Route definitions
│   ├── environments/
│   │   ├── environment.ts                 Development (API at localhost:8000)
│   │   └── environment.prod.ts            Production (reads API_URL from window.__env)
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── proxy.conf.js                          Dev server proxy rules
├── Dockerfile                             Multi-stage: deps → builder → nginx runner
├── docker-entrypoint.sh                   Injects runtime env vars into nginx config
├── nginx.conf.template                    nginx config template
├── Jenkinsfile                            CI/CD pipeline
├── angular.json                           Angular CLI configuration
├── tsconfig.json                          TypeScript configuration
├── eslint.config.js                       ESLint flat config (v9)
└── .prettierrc                            Prettier configuration
```

---

## Code standards

### TypeScript

- Strict mode is enabled (`strict: true` in `tsconfig.json`)
- No `any` types without a comment justifying the exception
- Prefer `readonly` for properties that do not need to be reassigned
- Use Angular signals or `async` pipe for reactive data — avoid manual subscriptions that outlive the component

### Linting (ESLint 9 + angular-eslint)

```bash
npm run lint          # check
npm run lint:fix      # auto-fix safe violations
```

Rules in `eslint.config.js`:
- `typescript-eslint` recommended + stylistic
- `@angular-eslint` component and directive conventions
- `@angular-eslint/template` HTML template rules

### Formatting (Prettier 3)

```bash
npm run format        # write
npm run format:check  # check only (CI)
```

Config in `.prettierrc`. Prettier and ESLint do not conflict — Prettier owns all formatting, ESLint owns correctness rules.

### Type checking

```bash
npm run typecheck     # tsc --noEmit
```

Run this before opening a PR. CI will fail if there are type errors.

### Angular conventions

| Convention | Rule |
|------------|------|
| Component selectors | `app-` prefix, kebab-case |
| File names | `<name>.component.ts`, `<name>.service.ts`, `<name>.guard.ts` |
| Signals vs Observables | Prefer Angular signals for local state; RxJS Observables for SSE streaming |
| Template bindings | Use `@if`, `@for` control flow (Angular 17+ block syntax) |
| Component styles | SCSS, scoped to the component (no global styles except `styles.scss`) |
| Dependency injection | Use `inject()` function — not constructor injection |

---

## Testing

Tests use [Vitest](https://vitest.dev/) with Angular TestBed utilities and `@vitest/coverage-v8`.

```bash
npm test              # watch mode (development)
npm run test:ci       # single run with coverage (CI)
```

Coverage reports written to `coverage/`:
- `coverage/lcov.info` — LCOV format (local tools, VS Code coverage extension)
- `coverage/cobertura-coverage.xml` — Cobertura XML (Jenkins Coverage plugin)

JUnit XML: set `VITEST_JUNIT_OUTPUT_FILE=<path>` to generate a JUnit report.

### Testing rules

- Every service must have tests for its public methods
- Every component must have at minimum a "should create" test (smoke test)
- Mock HTTP calls in service tests — do not make real network requests
- Use `TestBed` for component tests requiring Angular's dependency injection
- Coverage must not decrease on any PR

### Example service test pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';

describe('AuthService', () => {
  let service: AuthService;
  const mockHttp = { post: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: mockHttp }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});
```

---

## Adding a feature

1. **Create a feature module** under `src/app/features/<feature-name>/`
2. **Add a route** in `app.routes.ts`
3. **Guard the route** with `authGuard` if authentication is required:
   ```typescript
   { path: 'my-feature', component: MyFeatureComponent, canActivate: [authGuard] }
   ```
4. **Add a service** in `core/services/` if the feature requires backend communication
5. **Write tests** in `<name>.component.spec.ts` alongside the component file
6. **Update `models.ts`** if new shared interfaces are needed

### Adding an API call

1. Add the typed interface to `core/models.ts`
2. Add the method to the relevant service in `core/services/`
3. The `AuthInterceptor` automatically attaches the Bearer token — no manual header setup needed
4. Handle 401 responses — the interceptor should trigger a token refresh or redirect to `/login`

---

## API integration

The frontend communicates with the FastAPI backend via:

| Mechanism | Used for |
|-----------|---------|
| REST (JSON) | Auth endpoints (`/auth/*`), session management (`/chat/sessions`, `/chat/{id}/history`, `DELETE /chat/{id}`) |
| SSE (Server-Sent Events) | Chat streaming (`POST /chat`) |

### SSE implementation note

Use `fetch()` with a `ReadableStream` decoder — **not** the browser's `EventSource` API. `EventSource` is GET-only and cannot carry a request body (required for `POST /chat`).

```typescript
// Correct SSE pattern
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ session_id, message })
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
// ... read chunks, parse `data: <json>` lines
```

### SSE event shapes

```typescript
// token event — arrives many times during streaming
{ type: 'token', content: string }

// done event — arrives exactly once, always last
{
  type: 'done',
  session_id: string,
  reply: string,
  phase: 'discovery' | 'confirmation' | 'qa',
  candidates?: MovieCandidate[],    // only when phase === 'confirmation'
  confirmed_movie?: ConfirmedMovie  // only when phase === 'qa'
}
```

The Q&A phase does **not** emit token events — the full reply arrives only in the `done` event.

### Environment configuration

| File | Use |
|------|-----|
| `environments/environment.ts` | Development — `apiUrl: 'http://localhost:8000'` |
| `environments/environment.prod.ts` | Production — reads `window.__env.API_URL` injected by `docker-entrypoint.sh` |

---

## Docker

The `Dockerfile` uses three stages:

| Stage | Base | What happens |
|-------|------|-------------|
| `deps` | `node:20-alpine` | `npm ci` (mount cache) |
| `builder` | `node:20-alpine` | `ng build --configuration=production` |
| `runner` | `nginx:stable-alpine` | Serve the Angular bundle; proxy `/api` to backend |

Runtime environment variables injected at container start by `docker-entrypoint.sh`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `API_URL` | `""` (empty) | Passed to `window.__env.API_URL` in the Angular app |
| `BACKEND_URL` | `http://backend:8000` | nginx upstream target for `/api` proxy |

Build locally:
```bash
docker build -t movie-finder-frontend:local .
docker run -p 80:80 \
  -e API_URL="" \
  -e BACKEND_URL="http://host.docker.internal:8000" \
  movie-finder-frontend:local
```

---

## CI/CD

The `Jenkinsfile` runs three modes based on Git context:

| Mode | Trigger | Stages |
|------|---------|--------|
| CONTRIBUTION | Feature branch / PR | Type-check → Lint → Test |
| INTEGRATION | Push to `main` | + Build Docker image → Push `:sha8` + `:latest` to ACR → (opt) Staging deploy |
| RELEASE | `v*` tag | + Push `:v1.2.3` to ACR → (opt) Production deploy |

CONTRIBUTION builds must be green before any PR can be merged. No images are built or pushed in CONTRIBUTION mode.

**Jenkins credentials required (frontend pipeline):**

| ID | Kind | Purpose |
|----|------|---------|
| `acr-login-server` | Secret text | ACR hostname |
| `acr-credentials` | Username+Password | `docker login` to ACR |
| `azure-sp` | Username+Password | `az login` for Container App updates |

See [`docs/devops-setup.md §9`](../docs/devops-setup.md#9-jenkins--credentials) for setup instructions.
