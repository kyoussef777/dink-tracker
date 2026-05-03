# /bracket-engine — Bracket Generation Logic

Reference for implementing and extending `lib/bracket-engine.ts`. All functions in this file must be **pure** — no DB calls, no side effects, deterministic output.

## File Contract

```ts
// lib/bracket-engine.ts
export type BracketMatch = {
  position: number   // unique within bracket, used to wire next-round slots
  round: number      // 1 = first round
  team1Slot: number | null  // null = TBD (winner of match X advances here)
  team2Slot: number | null
  fromMatch1?: number  // match position whose winner feeds team1Slot
  fromMatch2?: number  // match position whose winner feeds team2Slot
}

export type GeneratedBracket = {
  matches: BracketMatch[]
  totalRounds: number
  hasByes: boolean
}
```

## Single Elimination

```ts
export function generateSingleElimination(
  teamCount: number,
  seeded = true
): GeneratedBracket {
  // Round up to next power of 2
  const size = nextPowerOf2(teamCount)
  const totalRounds = Math.log2(size)
  const byeCount = size - teamCount

  // Seeded bracket pairing: 1 vs size, 2 vs size-1, etc.
  const firstRoundMatchups = seededMatchups(size) // returns [[1,size],[2,size-1],...]

  const matches: BracketMatch[] = []
  let pos = 1

  // Round 1
  for (const [s1, s2] of firstRoundMatchups) {
    const isBye1 = s1 > teamCount
    const isBye2 = s2 > teamCount
    matches.push({
      position: pos++,
      round: 1,
      team1Slot: isBye1 ? null : s1,
      team2Slot: isBye2 ? null : s2,
    })
  }

  // Subsequent rounds (TBD slots, wired from previous round)
  for (let r = 2; r <= totalRounds; r++) {
    const matchesInRound = size / Math.pow(2, r)
    const prevRoundStart = pos - matchesInRound * 2
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        position: pos++,
        round: r,
        team1Slot: null,
        team2Slot: null,
        fromMatch1: prevRoundStart + i * 2,
        fromMatch2: prevRoundStart + i * 2 + 1,
      })
    }
  }

  return { matches, totalRounds, hasByes: byeCount > 0 }
}

function nextPowerOf2(n: number) {
  return Math.pow(2, Math.ceil(Math.log2(n)))
}

function seededMatchups(size: number): [number, number][] {
  if (size === 2) return [[1, 2]]
  const half = seededMatchups(size / 2)
  return half.map(([a, b]) => [[a, size + 1 - a], [b, size + 1 - b]]).flat() as [number, number][]
}
```

## Advance Winner

Called after a match result is saved. Returns updated matches with the winner slotted into the next round.

```ts
export function advanceWinner(
  completedMatchPos: number,
  winningSeed: number,
  allMatches: BracketMatch[]
): BracketMatch[] {
  return allMatches.map((m) => {
    if (m.fromMatch1 === completedMatchPos) {
      return { ...m, team1Slot: winningSeed }
    }
    if (m.fromMatch2 === completedMatchPos) {
      return { ...m, team2Slot: winningSeed }
    }
    return m
  })
}
```

## Round Robin

```ts
export function generateRoundRobin(teamCount: number): GeneratedBracket {
  // Berger tables algorithm for balanced scheduling
  const teams = Array.from({ length: teamCount }, (_, i) => i + 1)
  // If odd, add a bye team
  if (teams.length % 2 !== 0) teams.push(0)
  const n = teams.length
  const rounds = n - 1
  const matchesPerRound = n / 2
  const matches: BracketMatch[] = []
  let pos = 1

  const rotation = [...teams]
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < matchesPerRound; i++) {
      const t1 = rotation[i]
      const t2 = rotation[n - 1 - i]
      if (t1 !== 0 && t2 !== 0) {
        matches.push({ position: pos++, round: r + 1, team1Slot: t1, team2Slot: t2 })
      }
    }
    // Rotate all except first element
    rotation.splice(1, 0, rotation.pop()!)
  }

  return { matches, totalRounds: rounds, hasByes: teamCount % 2 !== 0 }
}
```

## Key Test Cases

Test these with Vitest:

```ts
// 8 teams, seeded → rounds = 3, matches = 7, no byes
// 5 teams, single elim → rounds = 3, matches = 7, 3 byes
// 2 teams → 1 match, 1 round
// 1 team → error or single champion
// 0 teams → error
// advanceWinner correctly populates next round slot
// round robin 4 teams → 3 rounds, 2 matches per round, each team plays 3 times
```

## Persistence Pattern

The bracket engine outputs match structs. Persist them to DB via:

```ts
// In API route after generating bracket:
const generated = generateSingleElimination(teams.length)
await db.match.createMany({
  data: generated.matches.map((m) => ({
    bracketId,
    round: m.round,
    position: m.position,
    team1Id: m.team1Slot ? seedToTeam[m.team1Slot]?.id ?? null : null,
    team2Id: m.team2Slot ? seedToTeam[m.team2Slot]?.id ?? null : null,
    status: (m.team1Slot === null || m.team2Slot === null) ? "BYE" : "PENDING",
    fromMatch1Position: m.fromMatch1 ?? null,
    fromMatch2Position: m.fromMatch2 ?? null,
  })),
})
```

## Arguments

$ARGUMENTS
