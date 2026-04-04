# Movie Finder — Frontend

Angular 21 SPA for the Movie Finder application. Communicates with the FastAPI backend via REST + SSE streaming.

## Developer Contract (Docker-only)

This project uses a **Docker-only developer contract**. All quality commands (lint, format, typecheck, test) run inside a Node.js container to ensure consistency between local development and CI. No Node.js or npm is required on your host machine.

### Prerequisites

| Tool           | Version | Notes                                                        |
| -------------- | ------- | ------------------------------------------------------------ |
| Docker Desktop | Latest  | [docker.com](https://www.docker.com/products/docker-desktop) |
| Make           | 3.81+   | Standard on macOS/Linux                                      |

### Quick Start

```bash
# 1. Initialize the project (pull image, npm ci, install git hook)
make init

# 2. Start the long-running dev container (enables instant execution)
make editor-up

# 3. Run all quality checks
make check

# 4. Open a shell in the dev container (if needed)
make shell
```

> **Warning:** Avoid running `npm install` or `npm ci` directly on your host. This can lead to permission issues (as `node_modules` are owned by root inside the container) and version mismatches. Always use `make init`.

---

## Available Commands (Makefile)

The `Makefile` is the primary entry point for all development tasks.

| Target               | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `make init`          | Pull Node image, run `npm ci`, and install the git pre-commit hook.     |
| `make editor-up`     | Start the `dev` container in the background for fast command execution. |
| `make editor-down`   | Stop and remove the `dev` container.                                    |
| `make shell`         | Open an interactive shell inside the `dev` container.                   |
| `make lint`          | Run ESLint (report only).                                               |
| `make format`        | Run Prettier (apply changes).                                           |
| `make fix`           | Run `ng lint --fix` + Prettier (apply all auto-fixes).                  |
| `make typecheck`     | Run `tsc --noEmit`.                                                     |
| `make test`          | Run Vitest in CI mode.                                                  |
| `make test-coverage` | Run Vitest with coverage and JUnit XML output for Jenkins.              |
| `make check`         | Run `typecheck`, `lint`, and `test-coverage` in sequence.               |
| `make build`         | Production Angular build (generates `dist/`).                           |
| `make ci-down`       | Full cleanup: stop container and remove local images/volumes.           |

---

## Development Workflow

### 1. VS Code Integration

This repo includes a pre-configured `.vscode/` directory. For the best experience:

1. Run `make editor-up`.
2. Attach VS Code to the running `movie-finder-frontend-dev` container using the **Dev Containers** extension.
3. The interpreter and all tools will be correctly mapped to the container's environment.

### 2. Pre-commit Hook

`make init` installs a git pre-commit hook that automatically runs `make pre-commit` (which executes `npx pre-commit run`) before every commit. This ensures no linting or formatting errors are committed.

### 3. Tests + Coverage

Tests use [Vitest](https://vitest.dev/). When running `make test-coverage`, results are written to:

- `test-results/frontend-results.xml` (JUnit)
- `coverage/cobertura-coverage.xml` (Cobertura)

---

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

## Docker Production Build

The multi-stage [Dockerfile](Dockerfile) produces a minimal nginx image:

```
Stage 1 (deps)    — npm ci
Stage 2 (builder) — ng build --configuration=production
Stage 3 (runner)  — nginx:stable-alpine + Angular bundle
```

Runtime environment variables are injected via [docker-entrypoint.sh](docker-entrypoint.sh):

| Variable      | Default               | Purpose                              |
| ------------- | --------------------- | ------------------------------------ |
| `API_URL`     | `` (empty)            | Injected into `window.__env.API_URL` |
| `BACKEND_URL` | `http://backend:8000` | nginx upstream proxy for `/api`      |

## CI/CD (Jenkins)

The [Jenkinsfile](Jenkinsfile) follows the project-wide pipeline standards:

1. **Checkout**: Standard git checkout.
2. **Initialize**: Runs `make init`.
3. **Lint + Typecheck**: Runs `make lint` and `make typecheck` in parallel.
4. **Test**: Runs `make test-coverage` and publishes results.
5. **Build + Deploy**: Build Docker image and deploy to Azure (Main/Tag only).

Test results are published to Jenkins via the JUnit plugin (`VITEST_JUNIT_OUTPUT_FILE`).
Coverage is published via the Coverage plugin (Cobertura XML from `coverage/`).
