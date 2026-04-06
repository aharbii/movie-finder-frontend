# Implement Issue — movie-finder-frontend

**Repo:** `aharbii/movie-finder-frontend`
**Parent tracker:** `aharbii/movie-finder`
**Pre-commit:** `make pre-commit` (runs inside Docker — no host Node required)

Implement GitHub issue #$ARGUMENTS from `aharbii/movie-finder-frontend`.

---

## Step 1 — Read the child issue

```bash
gh issue view $ARGUMENTS --repo aharbii/movie-finder-frontend
```

Find the **Agent Briefing** section. If absent, ask the user to add it before proceeding.

---

## Step 2 — Read the parent issue for full context

```bash
gh issue view [PARENT_NUMBER] --repo aharbii/movie-finder
```

---

## Step 3 — Read only the files listed in the Agent Briefing

---

## Step 4 — Create the branch

```bash
git checkout main && git pull
git checkout -b [type]/[kebab-case-title]
```

---

## Step 5 — Implement

Frontend-specific patterns:

- Angular 21, TypeScript 5.9, standalone components — no NgModules ever
- Smart / Dumb components: smart components own services and state; dumb components take `@Input()` only
- Facade service pattern: services wrap HttpClient and return typed observables/signals; components never call HttpClient directly
- Signals for all reactive state — no BehaviorSubject for component state
- SSE via `EventSource` — follow the existing chat stream implementation pattern
- Immutability: prefer `readonly` and `const` everywhere

General TypeScript standards:

- Strict mode on: `noImplicitAny`, `strictNullChecks`
- No `any` — use `unknown` + type narrowing
- No `console.log()` in production code
- ESLint 9 flat config + Prettier — must pass before commit
- Line length ≤ 120 chars

---

## Step 6 — Run quality checks

```bash
make pre-commit
```

Runs all hooks inside Docker — no host Node required. For a full quality gate use `make check`
(typecheck + lint + format:check + test-coverage).

---

## Step 7 — Commit

```bash
git add [only changed files — never git add -A]
git commit -m "$(cat <<'EOF'
type(scope): short summary

[why]

Closes #$ARGUMENTS
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Step 8 — Open PR

```bash
gh pr create \
  --repo aharbii/movie-finder-frontend \
  --title "type(scope): short summary" \
  --body "$(cat <<'EOF'
[PR body]

Closes #$ARGUMENTS
Parent: [PARENT_ISSUE_URL]

---
> AI-assisted implementation: Claude Code (claude-sonnet-4-6)
EOF
)"
```

---

## Step 9 — Cross-cutting comments

Comment on related issues (from Agent Briefing), the child issue, and the parent issue.
