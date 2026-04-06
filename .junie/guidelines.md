# JetBrains AI (Junie) — frontend submodule guidelines

This is **`movie-finder-frontend`** (`frontend/`) — Angular 21 SPA.
GitHub repo: `aharbii/movie-finder-frontend` · Parent: `aharbii/movie-finder`

---

## What this submodule does

Angular 21 SPA — the user-facing interface for Movie Finder.

- **User interaction:** natural language film search → streamed AI response via SSE
- **Auth:** JWT login flow with silent token refresh
- **Streaming:** `EventSource` consuming SSE from FastAPI backend
- **Hosting:** nginx container → Azure Container Apps

### Key layout

```
src/app/
├── core/          Auth, HTTP interceptors, guards, models
├── features/      Smart components (chat, search, auth pages)
└── shared/        Dumb components, directives, pipes
```

---

## Quality commands (Docker-only)

```bash
make pre-commit   # eslint + prettier + pre-commit hooks
make test         # vitest
make lint         # eslint
make check        # full quality gate (lint + typecheck + test)
```

---

## TypeScript standards

- **Strict mode** — `noImplicitAny`, `strictNullChecks` enforced
- **No `any`** — use `unknown` + type narrowing
- **Standalone components only** — no NgModules ever
- **Signals** for all reactive state — no `BehaviorSubject` for component state
- **Immutability** — prefer `readonly` and `const`
- **ESLint 9 flat config + Prettier** must pass before commit
- **No `console.log`** in production code

---

## Design patterns

| Pattern             | Where              | Rule                                                                    |
| ------------------- | ------------------ | ----------------------------------------------------------------------- |
| Smart / Dumb        | Angular components | Smart owns services + state; dumb takes `@Input()` only                 |
| Facade service      | HTTP layer         | Services wrap `HttpClient`, return typed observables/signals             |
| Signal-based state  | Reactive state     | Angular Signals; no `BehaviorSubject` for component-local state          |

---

## SSE contract

The `EventSource` in the chat feature consumes these event types from the backend:
- `content_delta` — incremental text chunk
- `candidate_found` — movie candidate data
- `status` — pipeline stage update
- `error` — error message
- `done` — stream complete

**Field renames in SSE events are breaking changes** — coordinate with `backend/chain/` before changing.

---

## Workflow

- Branches: `feature/<kebab>`, `fix/<kebab>`, `chore/<kebab>`, `docs/<kebab>`
- Commits: `feat(frontend): add keyboard shortcut for new chat`
- Pre-commit: `make pre-commit` (Docker)
- After merge: bump pointer in root `movie-finder`
