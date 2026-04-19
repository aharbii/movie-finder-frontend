# GitHub Copilot — movie-finder-frontend

Angular 21 SPA — natural-language film search with SSE streaming results and chat Q&A, served by nginx.

> For full project context, persona prompts, and architecture reference: see root `.github/copilot-instructions.md`.

---

## TypeScript standards

- **Strict mode**: `noImplicitAny`, `strictNullChecks` — no `any`, use `unknown` + type narrowing
- **Standalone components only** — no NgModules ever
- **Signals for all reactive state** — `BehaviorSubject` is acceptable for cross-component streams, but never for component-local state
- `readonly` wherever possible — signal inputs, injected services, model interfaces
- No `console.log` left in production code — use a proper logging service
- Run `npm run typecheck && npm run lint && npm run format:check` before committing

---

## Design patterns

| Pattern                     | Rule                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Smart / Dumb components** | Smart components own services and state. Dumb (presentational) components receive `@Input()` only and emit `@Output()`. No service injection in dumb components. |
| **Facade service**          | Services wrap `HttpClient` and `EventSource`, returning typed signals or observables. Components never call `HttpClient` or `EventSource` directly.    |
| **Runtime config injection** | Environment-specific config (API URL) is injected at container start via `docker-entrypoint.sh` — not baked into the Angular build.                  |

---

## Key files

| Path                    | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `src/`                  | Angular application source — components, services, models            |
| `eslint.config.js`      | ESLint 9 flat config                                                 |
| `nginx.conf.template`   | Production nginx config (env-var substituted at container start)     |
| `docker-entrypoint.sh`  | Injects runtime env into the built app — no build-time secrets       |
| `proxy.conf.js`         | Dev server proxy to backend (localhost:8000)                         |
