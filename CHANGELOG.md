# Changelog

All notable changes to `movie-finder-frontend` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

- Angular 21 SPA with standalone components and Signal-based state
- Authentication flow: `/login` and `/register` pages with JWT Bearer token handling
- Chat interface: session sidebar, SSE-streamed message thread, candidate cards, movie detail panel
- `AuthInterceptor` — automatically attaches Bearer token to all outgoing requests
- `AuthGuard` — redirects unauthenticated users to `/login`
- `AuthService` — register, login, refresh, logout
- `ChatService` — SSE streaming via `fetch` + `ReadableStream`, session management
- Docker-only developer contract: `make init`, `make editor-up`, `make check`
- Multi-stage Dockerfile: deps → builder → nginx runner
- Runtime environment injection via `docker-entrypoint.sh` (`API_URL`, `BACKEND_URL`)
- Vitest test suite with Angular TestBed and `@vitest/coverage-v8`
- Jenkins Multibranch Pipeline (CONTRIBUTION → INTEGRATION → RELEASE modes)
- ESLint 9 flat config + Prettier 3 + `detect-secrets` pre-commit hooks
