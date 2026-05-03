# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project: Dink Tracker — Pickleball Tournament Manager

A real-time, fully customizable pickleball tournament tracking platform. Supports multiple simultaneous brackets per skill level, live score updates, mobile-first UX, and rich search.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router (TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL via Neon (Vercel Marketplace) |
| ORM | Prisma |
| Real-time | Pusher Channels (WebSocket broadcasts) |
| Auth | Clerk (Vercel Marketplace native) |
| Client State | Zustand |
| Server State | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Testing | Vitest + Testing Library + Playwright |
| Deployment | Vercel (App Router, Fluid Compute) |
| CI | GitHub Actions |

---

## Commands

```bash
# Bootstrap (first time)
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
npm install prisma @prisma/client zustand @tanstack/react-query pusher pusher-js zod react-hook-form @hookform/resolvers
npx shadcn@latest init
npx prisma init

# Dev
npm run dev           # Next.js dev server on :3000
npm run db:push       # Sync Prisma schema to dev DB (no migration file)
npm run db:migrate    # Create & apply migration
npm run db:studio     # Prisma Studio GUI
npm run db:seed       # Seed demo data

# Test
npm run test          # Vitest unit/integration tests (watch mode)
npm run test:run      # Vitest single pass (CI)
npm run test:e2e      # Playwright E2E
npm run test:e2e:ui   # Playwright with UI

# Quality
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run format        # Prettier

# Build
npm run build         # Production build
npm run start         # Start production server

# Git flow (use these in order after a feature)
npm run test:run && npm run typecheck && npm run lint
```

Add these scripts to `package.json`:
```json
{
  "scripts": {
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write ."
  }
}
```

---

## Architecture

### Directory Layout

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Clerk auth routes (sign-in, sign-up)
│   ├── (dashboard)/            # Authenticated app shell
│   │   ├── tournaments/        # Tournament list + create
│   │   │   └── [id]/           # Tournament detail
│   │   │       ├── brackets/   # Bracket views
│   │   │       │   └── [bracketId]/  # Single bracket + live scoring
│   │   │       └── settings/   # Tournament config
│   │   ├── players/            # Player directory + search
│   │   └── layout.tsx          # Dashboard shell (sidebar, nav)
│   ├── api/
│   │   ├── tournaments/        # CRUD + action endpoints
│   │   ├── brackets/           # Bracket generation + match results
│   │   ├── matches/            # Score submission
│   │   ├── players/            # Player CRUD + search
│   │   └── pusher/             # Pusher auth endpoint
│   ├── layout.tsx              # Root layout (Clerk, QueryClient, Providers)
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn base components (auto-generated, do not edit)
│   ├── bracket/                # BracketView, MatchCard, BracketTree
│   ├── tournament/             # TournamentCard, TournamentForm, SkillLevelBadge
│   ├── match/                  # ScoreInput, MatchStatus, CourtDisplay
│   ├── player/                 # PlayerCard, PlayerSearch, PlayerForm
│   └── shared/                 # LiveIndicator, StatusBadge, SearchBar, EmptyState
├── hooks/
│   ├── useTournament.ts        # TanStack Query wrappers for tournament data
│   ├── useBracket.ts           # Bracket queries + optimistic updates
│   ├── useMatch.ts             # Match mutations (score submit)
│   ├── useLive.ts              # Pusher subscription hook
│   └── useSearch.ts            # Debounced search hook
├── lib/
│   ├── db.ts                   # Prisma client singleton
│   ├── pusher.ts               # Pusher server + client instances
│   ├── bracket-engine.ts       # Bracket generation algorithms (single/double elim, round robin)
│   ├── validators.ts           # Shared Zod schemas (single source of truth)
│   └── utils.ts                # cn(), formatDate(), seedRandom()
├── store/
│   └── tournamentStore.ts      # Zustand: active tournament UI state (selected bracket, filters)
├── types/
│   └── index.ts                # Derived TypeScript types from Prisma + Zod
└── prisma/
    ├── schema.prisma
    └── seed.ts
```

### Data Model (Prisma Schema)

```prisma
model Tournament {
  id          String   @id @default(cuid())
  name        String
  venue       String?
  startDate   DateTime
  endDate     DateTime?
  status      TournamentStatus @default(DRAFT)
  description String?
  createdBy   String           // Clerk userId
  brackets    Bracket[]
  players     PlayerEntry[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Bracket {
  id           String        @id @default(cuid())
  tournamentId String
  tournament   Tournament    @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  skillLevel   String        // "5.0", "4.5", "4.0", "3.5", "Open", etc. (free text)
  format       BracketFormat @default(SINGLE_ELIMINATION)
  status       BracketStatus @default(PENDING)
  teams        Team[]
  matches      Match[]
  rounds       Int           @default(0)
  createdAt    DateTime      @default(now())
}

model Team {
  id        String  @id @default(cuid())
  bracketId String
  bracket   Bracket @relation(fields: [bracketId], references: [id], onDelete: Cascade)
  name      String
  seed      Int?
  players   Player[]
  matchesAs1 Match[] @relation("Team1")
  matchesAs2 Match[] @relation("Team2")
  wonMatches Match[] @relation("Winner")
}

model Match {
  id         String      @id @default(cuid())
  bracketId  String
  bracket    Bracket     @relation(fields: [bracketId], references: [id], onDelete: Cascade)
  round      Int
  position   Int         // position in bracket tree
  team1Id    String?
  team1      Team?       @relation("Team1", fields: [team1Id], references: [id])
  team2Id    String?
  team2      Team?       @relation("Team2", fields: [team2Id], references: [id])
  winnerId   String?
  winner     Team?       @relation("Winner", fields: [winnerId], references: [id])
  score1     Int[]       // Array of game scores for team1 [11, 11, 6]
  score2     Int[]       // Array of game scores for team2 [7, 9, 11]
  court      String?
  status     MatchStatus @default(PENDING)
  scheduledAt DateTime?
  completedAt DateTime?
}

model Player {
  id       String  @id @default(cuid())
  teamId   String
  team     Team    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  name     String
  rating   Float?
  email    String?
  phone    String?
}

model PlayerEntry {
  id           String     @id @default(cuid())
  tournamentId String
  tournament   Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  name         String
  rating       Float?
  email        String?
}

enum TournamentStatus { DRAFT REGISTRATION ACTIVE COMPLETED CANCELLED }
enum BracketFormat    { SINGLE_ELIMINATION DOUBLE_ELIMINATION ROUND_ROBIN POOL_PLAY }
enum BracketStatus    { PENDING ACTIVE COMPLETED }
enum MatchStatus      { PENDING IN_PROGRESS COMPLETED BYE }
```

### Real-time Architecture

Every score update triggers:
1. `PATCH /api/matches/[id]` → updates DB → calls `pusher.trigger()`
2. Pusher broadcasts on channel `tournament-{tournamentId}` event `match-updated`
3. `useLive(tournamentId)` hook on clients receives event → calls `queryClient.invalidateQueries(['bracket', bracketId])`
4. TanStack Query refetches only the affected bracket

Channel naming: `tournament-{id}`, `bracket-{id}`

### Bracket Engine (`lib/bracket-engine.ts`)

Exports:
- `generateSingleElimination(teams, seeded?)` → `Match[]`
- `generateDoubleElimination(teams)` → `{ winners: Match[], losers: Match[] }`
- `generateRoundRobin(teams)` → `Match[]`
- `advanceWinner(match, winnerId, bracketMatches)` → updated `Match[]` with next round populated

---

## Development Workflow (Automated Loop)

Every feature follows this sequence. Run it in order:

```
1. FEATURE   — implement in a worktree branch
2. TEST       — npm run test:run (must pass)
3. TYPECHECK  — npm run typecheck (zero errors)
4. LINT       — npm run lint (zero warnings)
5. BUILD      — npm run build (must succeed)
6. REVIEW     — /ultrareview  (multi-agent code review)
7. SIMPLIFY   — /simplify     (Claude reviews for over-engineering)
8. PUSH       — git push origin <branch> && gh pr create
```

### Git Branch Convention

```
feat/tournament-creation
feat/bracket-engine-single-elim
feat/live-scoring
feat/player-search
fix/<short-description>
chore/<short-description>
```

### PR Template (`.github/pull_request_template.md`)

```markdown
## What
<!-- One-liner -->

## Why
<!-- Context or ticket link -->

## Test plan
- [ ] Unit tests pass (`npm run test:run`)
- [ ] Types check (`npm run typecheck`)
- [ ] Manually tested: [describe scenario]
```

---

## Agent Orchestration

### Parallel Agents Pattern

When implementing a new feature, Claude should spawn parallel agents:

- **backend agent** (`feature-dev:code-architect`) — API routes, Prisma queries, bracket engine logic
- **frontend agent** (`ui-design:ui-designer`) — components, hooks, TanStack Query integration
- **test agent** (`full-stack-orchestration:test-automator`) — Vitest unit tests, Playwright E2E

After all three complete, run `/simplify` then `/ultrareview`.

### Feature Priorities (Ordered Build Sequence)

1. **Phase 1 — Foundation**
   - Next.js scaffold + Prisma schema + Neon DB via Vercel Marketplace
   - Clerk auth (sign in/out, protected routes via middleware)
   - Tournament CRUD (create, list, view, edit, delete)
   - Seed data script

2. **Phase 2 — Brackets**
   - Bracket creation per tournament (multiple skill levels)
   - Team/player entry
   - Bracket engine: single elimination generator
   - Bracket tree visualization component
   - Clean modern Ui build by expert designer (NO EMOJIS)

3. **Phase 3 — Live Scoring**
   - Match score entry UI (court assignment, game-by-game scores)
   - Pusher integration (real-time score propagation)
   - Live indicator component
   - Auto-advance winners in bracket

4. **Phase 4 — Search & Discovery**
   - Full-text player search (Prisma `contains` + debounce)
   - Tournament filtering (status, date, skill level)
   - Bracket filter within tournament

5. **Phase 5 — Polish & Deploy**
   - Double elimination bracket engine
   - Round robin format
   - Mobile-optimized bracket view (horizontal scroll, zoom)
   - Tournament sharing (public read-only view, no auth required)
   - Vercel deploy + domain

---

## Key Conventions

### API Routes

All routes return `{ data, error }` shape. Errors use HTTP status codes. No custom error classes.

```ts
// app/api/tournaments/route.ts
export async function GET(req: Request) {
  const tournaments = await db.tournament.findMany(...)
  return Response.json({ data: tournaments })
}
```

### Server vs Client Components

- Default to **Server Components** — fetch directly in component, no `useEffect`
- Add `"use client"` only for: interactivity, Zustand, Pusher subscriptions, React Hook Form
- Colocate data fetching with the component that owns it

### Zod Validators

All API input validation uses Zod schemas from `lib/validators.ts`. Same schema validates both client-side form and server-side API handler — import from one place.

### Optimistic Updates

For score submissions, use TanStack Query's `onMutate` optimistic update pattern so the UI updates instantly before the server responds.

### Tailwind + shadcn

- Use shadcn primitives for all interactive elements (Button, Input, Dialog, Select, Badge, etc.)
- Do not add custom CSS files — use `cn()` from `lib/utils.ts` for conditional classes
- Design tokens: pickleball green `#6ab04c`, court blue `#0c2461`, accent yellow `#f9ca24`

---

## Environment Variables

```env
# .env.local (never committed)
DATABASE_URL=             # Neon connection string
DIRECT_URL=               # Neon direct URL (for migrations)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
PUSHER_APP_ID=
PUSHER_SECRET=
```

Pull from Vercel: `vercel env pull .env.local`

---

## Testing Strategy

- **Unit**: bracket engine functions (pure logic — seed, generate, advance)
- **Integration**: API route handlers using `@prisma/client/testing` mock
- **Component**: TournamentCard, MatchCard, BracketTree with Testing Library
- **E2E**: full flow — create tournament → add bracket → enter teams → submit score → verify bracket advances

---

## Custom Slash Commands

Project-level commands in `.claude/commands/`. Invoke as `/command-name [args]`.

| Command | Purpose |
|---|---|
| `/scaffold` | Bootstrap Phase 1 from scratch (run once) |
| `/phase-status` | Check which phase we're on, what to build next, and offer to start |
| `/new-feature <name>` | Spawn 3 parallel agents (backend + frontend + tests) for a feature |
| `/ship "commit msg"` | Run full quality gate (test→typecheck→lint→build) then commit + push |
| `/implementing-drag-drop` | Reference guide for dnd-kit drag-and-drop in this app |
| `/live-feature` | Reference guide for Pusher real-time features |
| `/bracket-engine` | Reference guide for `lib/bracket-engine.ts` pure logic |
| `/db [migrate\|seed\|reset\|status]` | Prisma DB operations |

## Hooks (`.claude/settings.json`)

- **PostToolUse[Write\|Edit]** — runs `typecheck` after editing any `.ts/.tsx` file; prints first 12 error lines if any
- **Stop** — after each Claude turn, prints last 5 git commits + current git status + dev loop reminder

## Session Continuity

At the start of any new session, Claude should:
1. Read this file
2. Run `/phase-status` to identify where we are and get a continuation plan
3. Check `git status` for any in-progress work
4. If a feature is partially implemented, finish it before starting the next one

This ensures any new Claude session picks up exactly where the last left off without re-explanation.
