## What and why

<!-- What changed and why? Link the issue this addresses. -->

Closes #

## Type of change

- [ ] Feature (new UI capability)
- [ ] Bug fix
- [ ] Breaking change (API contract, SSE event fields, route path)
- [ ] Chore (tooling, dependencies, CI config)
- [ ] Documentation only

## How to test

1.
2.
3.

## CI status

The following Jenkins stages must be green before merge:

| Stage        | Command              | Trigger           |
| ------------ | -------------------- | ----------------- |
| Type-check   | `make typecheck`     | All PRs           |
| Lint         | `make lint`          | All PRs           |
| Test         | `make test-coverage` | All PRs           |
| Build Docker | `docker build`       | `main` / tag only |

## Checklist

### Code quality

- [ ] `make check` passes (typecheck + lint + test-coverage) — zero errors/failures
- [ ] New components have at minimum a `should create` smoke test
- [ ] New services have tests for all public methods
- [ ] No real HTTP calls in tests — mock at the `HttpClient` boundary
- [ ] No `console.log` left in production code
- [ ] No `any` types without an inline justification comment

### Angular conventions

- [ ] Smart/Dumb boundary respected — no service injection in dumb (presentational) components
- [ ] Signals used for component-local state (not `BehaviorSubject`)
- [ ] Standalone components only — no NgModules

### Documentation

- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] `README.md` updated if Docker config, make targets, or env vars changed

### API integration _(if applicable)_

- [ ] New or changed SSE event fields verified against the backend `StreamingResponse`
- [ ] Auth / route changes communicated to the backend team
- [ ] `environments/environment*.ts` updated for new API base paths

### Review

- [ ] PR title follows `type(scope): summary` (≤72 chars, imperative mood, lowercase)
- [ ] PR description links the issue and discloses the AI authoring tool + model used
- [ ] Any AI-assisted review comment or approval discloses the review tool + model

### Release _(for release PRs only)_

- [ ] `version` bumped in `package.json`
- [ ] `[Unreleased]` section moved to the new version in `CHANGELOG.md`
- [ ] Git tag created after merge: `git tag vX.Y.Z && git push origin --tags`
