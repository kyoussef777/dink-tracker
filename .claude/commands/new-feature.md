# /new-feature — Scaffold Feature with Parallel Agents

Orchestrates a new feature using three parallel agents: backend, frontend, and tests. Designed for the dink-tracker development loop.

## Usage

```
/new-feature tournament-crud
/new-feature bracket-engine
/new-feature live-scoring
/new-feature player-search
```

## Orchestration Steps

### Step 1 — Read CLAUDE.md
Confirm the feature fits the current phase. If not, raise it and ask to confirm.

### Step 2 — Plan (before spawning agents)

Think through:
1. **API routes needed** — list each endpoint (`method path → what it does`)
2. **Prisma queries** — which models are touched
3. **Components needed** — list each with its location in the directory structure
4. **Real-time** — does this feature need Pusher? Which channel/event?
5. **Tests** — what unit tests (bracket engine pure logic), what integration tests (API routes), what E2E flows

Write this plan out in 1 paragraph, then proceed.

### Step 3 — Spawn Three Parallel Agents

Spawn all three simultaneously. Brief each agent completely — they have no session context.

**Agent 1: Backend**
- Subagent type: `feature-dev:code-architect`
- Implement: API routes, Prisma queries, lib utilities (validators, bracket-engine functions)
- Follow: server component data fetching, `{ data, error }` response shape, Zod validation at boundary
- DO NOT implement UI components

**Agent 2: Frontend**
- Subagent type: `ui-design:ui-designer`
- Implement: React components, hooks (TanStack Query wrappers), Zustand store updates
- Follow: Server Components by default, `"use client"` only for interactivity, shadcn primitives, `cn()` for classes
- DO NOT implement API routes

**Agent 3: Tests**
- Subagent type: `full-stack-orchestration:test-automator`
- Implement: Vitest unit tests for pure logic, component tests with Testing Library, Playwright E2E for the happy path
- Write tests for: bracket generation correctness, form validation, API response shapes

### Step 4 — Integration

After all three agents complete:
1. Review each agent's work for conflicts (e.g., type mismatches between API and component)
2. Wire frontend hooks to the actual API endpoints
3. Run `/ship` to quality-gate and commit

### Step 5 — Simplify (invoke after integration)

Run the built-in `/simplify` skill to check for over-engineering, then push.

## Feature-Specific Notes

### `tournament-crud`
Routes: GET/POST `/api/tournaments`, GET/PATCH/DELETE `/api/tournaments/[id]`
Components: TournamentList, TournamentCard, TournamentForm (create/edit), DeleteConfirmDialog
Tests: CRUD API unit tests, TournamentCard render test, E2E: create → view → edit → delete

### `bracket-engine`
lib/bracket-engine.ts: pure functions only (no DB calls)
Routes: POST `/api/brackets` (create + generate matches), GET `/api/brackets/[id]`
Components: BracketTree, MatchCard (read-only), BracketHeader
Tests: heavy unit tests for bracket generation edge cases (odd/even teams, byes, seeding)

### `live-scoring`
Requires Pusher env vars in `.env.local`
Routes: PATCH `/api/matches/[id]` → updates score → calls `pusher.trigger()`
Hook: `useLive(tournamentId)` subscribes to `tournament-{id}` channel
Components: ScoreInput, LiveIndicator, CourtBadge
Tests: mock Pusher in tests; E2E: submit score → verify bracket updates without page refresh

### `player-search`
Route: GET `/api/players/search?q=&tournamentId=` using Prisma `contains` (case insensitive)
Hook: `useSearch(query)` with 300ms debounce
Component: PlayerSearch with combobox (shadcn Command), PlayerCard
Tests: debounce behavior, empty state, result rendering

## Arguments

$ARGUMENTS
