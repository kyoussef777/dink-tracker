# /phase-status — Check Progress & Continue

Determines which Phase from CLAUDE.md we're currently on and what to build next. Use at the start of any session to resume where we left off.

## What This Command Does

### Step 1 — Read Context
Read `CLAUDE.md` — specifically the **Feature Priorities** section (the 5 phases).

### Step 2 — Check Git History
```bash
git log --oneline
git status
```
Map each commit to its Phase to determine what has been built.

### Step 3 — Identify Current Phase
Cross-reference commits with the CLAUDE.md phase checklist:

**Phase 1 — Foundation**
- [ ] Next.js scaffold (package.json, app router, tailwind, shadcn)
- [ ] Prisma schema committed
- [ ] Neon DB connected (DATABASE_URL in .env.local)
- [ ] Clerk auth (sign-in page, middleware, protected routes)
- [ ] Tournament CRUD (list, create, view, edit, delete)
- [ ] Seed data script

**Phase 2 — Brackets**
- [ ] Bracket creation with skill level
- [ ] Team/player entry forms
- [ ] `lib/bracket-engine.ts` — single elimination generator
- [ ] Bracket tree visualization component

**Phase 3 — Live Scoring**
- [ ] Match score entry UI
- [ ] Pusher integration (server + client)
- [ ] `useLive` hook
- [ ] Auto-advance winners in bracket

**Phase 4 — Search & Discovery**
- [ ] Full-text player search
- [ ] Tournament filtering by status/date/skill level
- [ ] Bracket filter within tournament

**Phase 5 — Polish & Deploy**
- [ ] Double elimination format
- [ ] Round robin format
- [ ] Mobile bracket view (horizontal scroll)
- [ ] Public share view (no auth required)
- [ ] Vercel production deploy

### Step 4 — Report

Output a clear status:
```
Current Phase: X — <name>
Completed: X items
Next task: <specific item>
Estimated scope: <small/medium/large>
```

### Step 5 — Offer to Continue

Ask: "Want me to start [next task]? I'll spawn parallel agents for backend, frontend, and tests."

If the user says yes, proceed directly — do not wait for further instructions. Use the `/new-feature` workflow.
