# Review PR — movie-finder-frontend

**Repo:** `aharbii/movie-finder-frontend`

Post findings as a comment only. Do not submit a GitHub review status.
The human decides whether to merge.

---

## Step 1 — Read PR, issue, and diff

```bash
gh pr view $ARGUMENTS --repo aharbii/movie-finder-frontend
gh issue view [LINKED_ISSUE] --repo aharbii/movie-finder-frontend
gh pr diff $ARGUMENTS --repo aharbii/movie-finder-frontend
```

---

## Blocking findings

**Angular-specific patterns:**

- NgModule introduced (standalone components only)
- `any` used (must use `unknown` + type narrowing)
- Smart/Dumb boundary violated (dumb component injecting a service)
- Component calling `HttpClient` directly (must go through facade service)
- `BehaviorSubject` for component state (must use Signals)
- `console.log()` in production code

**SSE (if changed):** must use `EventSource`, no polling.

**TypeScript strict mode:** `noImplicitAny` or `strictNullChecks` violations.

**PR hygiene:** AI disclosure missing, issue not linked, ESLint + Prettier not run.

---

## Post as a comment

```bash
gh pr comment $ARGUMENTS --repo aharbii/movie-finder-frontend \
  --body "[review comment body]"
```

```
## Review — [date]
Reviewed by: [tool and model]

### Verdict
PASS — no blocking findings. Human call to merge.
— or —
BLOCKING FINDINGS — must fix before merge.

### Blocking findings
[file:line] — [issue and fix]

### Non-blocking observations
[file:line] — [observation]

### Cross-cutting gaps
[any item not handled and not noted in PR body]
```
