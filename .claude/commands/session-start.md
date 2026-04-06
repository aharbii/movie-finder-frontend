# Session Start — movie-finder-frontend

Run these checks in parallel, then give a prioritised summary. Do not read any source files.

```bash
gh issue list --repo aharbii/movie-finder-frontend --state open --limit 20 \
  --json number,title,labels,assignees
```

```bash
gh pr list --repo aharbii/movie-finder-frontend --state open \
  --json number,title,state,labels,headRefName
```

```bash
gh issue list --repo aharbii/movie-finder --state open --limit 10 \
  --json number,title,labels
```

```bash
git status && git log --oneline -5
```

Then summarise:

- **Open issues in this repo** — number, title, severity label
- **Open PRs** — which are ready to review, which are blocked
- **Parent issues** — any root movie-finder issues that affect the frontend
- **Current branch and uncommitted changes**
- **Recommended next action** — one specific thing

Note: SSE event field changes in `movie-finder-chain` are always breaking for this repo.
Check chain issues for any planned API shape changes before starting implementation.

Keep the summary under 20 lines. Do not propose solutions yet.
