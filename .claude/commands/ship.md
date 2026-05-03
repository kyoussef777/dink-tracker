# /ship — Quality Gate + Commit + Push

Runs the full quality gate for dink-tracker, then commits and pushes. Argument is the commit message subject.

## Usage

```
/ship "feat: add single elimination bracket engine"
/ship "fix: correct score submission optimistic update"
```

## What This Command Does

Run these steps **in order**. Stop and fix before continuing if any step fails.

### Step 1 — Tests
```bash
npm run test:run
```
All tests must pass. If any fail, fix them before proceeding.

### Step 2 — TypeScript
```bash
npm run typecheck
```
Zero errors. Warnings are acceptable but note them.

### Step 3 — Lint
```bash
npm run lint
```
Zero errors. If ESLint is not yet configured, skip and note it.

### Step 4 — Build
```bash
npm run build
```
Must succeed. Fix any build errors before proceeding.

### Step 5 — Commit

Stage only relevant files (not `.env*`, `node_modules`, `.next`):
```bash
git add -A
git status  # review what's staged
git commit -m "<argument from /ship command>

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

### Step 6 — Push
```bash
git push origin <current-branch>
```

If on `main`, push directly. If on a feature branch, push and create a PR:
```bash
gh pr create --title "<commit subject>" --body "$(cat <<'EOF'
## What
<describe what changed>

## Test plan
- [ ] Unit tests pass (`npm run test:run`)
- [ ] Types check (`npm run typecheck`)
- [ ] Manually tested: <describe>
EOF
)"
```

## After Shipping

Report: what was shipped, the commit hash, and what Phase from CLAUDE.md this completes.
Then ask: "Ready to start the next item in the build sequence?"

## Arguments

$ARGUMENTS
