# /db — Database Operations

Handles Prisma schema changes, migrations, and seed data for dink-tracker.

## Usage

```
/db migrate "add court column to match"
/db seed
/db reset
/db status
```

## Commands by Situation

### Iterating on schema during development (no migration file needed)
```bash
npm run db:push   # sync schema directly to dev DB, wipes data if breaking change
```

### Creating a versioned migration (production-safe)
```bash
npm run db:migrate -- --name "<description>"
# e.g.: npm run db:migrate -- --name "add-court-to-match"
```

### View data
```bash
npm run db:studio  # opens Prisma Studio at localhost:5555
```

### Seed demo data
```bash
npm run db:seed
```

### Reset dev DB completely
```bash
npx prisma migrate reset  # drops all data + re-runs migrations + seeds
```

## Seed Script (`prisma/seed.ts`)

When asked to implement seeding, create `prisma/seed.ts` with this structure:

```ts
import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()

async function main() {
  // Demo tournament
  const tournament = await db.tournament.upsert({
    where: { id: "demo-tournament" },
    update: {},
    create: {
      id: "demo-tournament",
      name: "Spring Open 2025",
      venue: "Dink City Courts",
      startDate: new Date("2025-05-15"),
      status: "ACTIVE",
      createdBy: "seed",
    },
  })

  // Two brackets: 4.0 and 4.5
  for (const [skillLevel, teamNames] of [
    ["4.0", ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"]],
    ["4.5", ["Team Ace", "Team Smash", "Team Dink", "Team Rally"]],
  ] as const) {
    const bracket = await db.bracket.create({
      data: { tournamentId: tournament.id, skillLevel, format: "SINGLE_ELIMINATION", status: "ACTIVE" },
    })
    for (const name of teamNames) {
      await db.team.create({
        data: {
          bracketId: bracket.id,
          name,
          players: { create: [{ name: `${name} P1` }, { name: `${name} P2` }] },
        },
      })
    }
  }

  console.log("Seeded: 1 tournament, 2 brackets, 8 teams")
}

main().catch(console.error).finally(() => db.$disconnect())
```

## Schema Change Workflow

1. Edit `prisma/schema.prisma`
2. Run `npm run db:push` (dev only, fast iteration)
3. Regenerate client: `npx prisma generate`
4. Update TypeScript types in `src/types/index.ts` if needed
5. When ready to commit: run `npm run db:migrate -- --name "<desc>"` to create a migration file
6. Commit both the schema and the migration file

## Arguments

$ARGUMENTS
