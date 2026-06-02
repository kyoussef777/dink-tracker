import { describe, it, expect } from "vitest"
import {
  generateSingleElimination,
  generateRoundRobin,
  generateDoubleElimination,
  advanceWinner,
  generateBracket,
  resolveByes,
  type BracketMatch,
} from "./bracket-engine"

describe("generateSingleElimination", () => {
  it("8 teams: 3 rounds, 7 matches, no byes", () => {
    const { matches, totalRounds, hasByes } = generateSingleElimination(8)
    expect(totalRounds).toBe(3)
    expect(matches).toHaveLength(7)
    expect(hasByes).toBe(false)
  })

  it("5 teams: play-in (1 play-in + 4-team main), 4 matches, no byes", () => {
    const { matches, totalRounds, hasByes } = generateSingleElimination(5)
    expect(hasByes).toBe(false)
    expect(totalRounds).toBe(3) // play-in + semis + final
    expect(matches).toHaveLength(4) // 1 play-in + 2 main R1 + 1 final
    const playIn = matches.filter((m) => m.round === 1)
    expect(playIn).toHaveLength(1)
    // Play-in pairs the two lowest seeds (4 vs 5) and feeds a main-round slot.
    expect([playIn[0].team1Seed, playIn[0].team2Seed].sort((a, b) => a! - b!)).toEqual([4, 5])
    const fed = matches.find((m) => m.fromMatch1Pos === playIn[0].position || m.fromMatch2Pos === playIn[0].position)
    expect(fed?.round).toBe(2)
  })

  it("19 teams (beginner bracket): 3 play-in matches feeding a 16-team main draw", () => {
    const { matches, totalRounds, hasByes } = generateSingleElimination(19)
    expect(hasByes).toBe(false)
    // base = 16, overflow = 3 -> play-in(3) + R16(8) + QF(4) + SF(2) + Final(1)
    expect(totalRounds).toBe(5)
    expect(matches.filter((m) => m.round === 1)).toHaveLength(3) // play-in
    expect(matches.filter((m) => m.round === 2)).toHaveLength(8) // round of 16
    expect(matches.filter((m) => m.round === 3)).toHaveLength(4) // QF
    expect(matches.filter((m) => m.round === 4)).toHaveLength(2) // SF
    expect(matches.filter((m) => m.round === 5)).toHaveLength(1) // Final
    expect(matches).toHaveLength(18)
    // Every one of the 19 seeds appears exactly once as a starting team.
    const startSeeds = matches
      .flatMap((m) => [m.team1Seed, m.team2Seed])
      .filter((s): s is number => s !== null)
    expect(new Set(startSeeds).size).toBe(19)
    expect(startSeeds).toHaveLength(19)
  })

  it("6 and 7 teams: play-in with no byes, every team plays", () => {
    for (const n of [6, 7]) {
      const { matches, hasByes } = generateSingleElimination(n)
      expect(hasByes).toBe(false)
      const seeds = matches
        .flatMap((m) => [m.team1Seed, m.team2Seed])
        .filter((s): s is number => s !== null)
      expect(new Set(seeds).size).toBe(n)
    }
  })

  it("2 teams: 1 round, 1 match", () => {
    const { matches, totalRounds } = generateSingleElimination(2)
    expect(totalRounds).toBe(1)
    expect(matches).toHaveLength(1)
  })

  it("seeded: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5 in round 1 for 8 teams", () => {
    const { matches } = generateSingleElimination(8)
    const round1 = matches.filter((m) => m.round === 1)
    const pairs = round1.map((m) => [m.team1Seed, m.team2Seed].sort((a, b) => a! - b!))
    expect(pairs).toContainEqual([1, 8])
    expect(pairs).toContainEqual([2, 7])
    expect(pairs).toContainEqual([3, 6])
    expect(pairs).toContainEqual([4, 5])
  })

  it("throws for less than 2 teams", () => {
    expect(() => generateSingleElimination(1)).toThrow()
  })

  it("later rounds have fromMatch pointers", () => {
    const { matches } = generateSingleElimination(4)
    const round2 = matches.filter((m) => m.round === 2)
    expect(round2[0].fromMatch1Pos).toBeDefined()
    expect(round2[0].fromMatch2Pos).toBeDefined()
  })
})

describe("generateRoundRobin", () => {
  it("4 teams: 3 rounds, 6 matches, each team plays 3 times", () => {
    const { matches, totalRounds } = generateRoundRobin(4)
    expect(totalRounds).toBe(3)
    expect(matches).toHaveLength(6)

    const appearances = new Map<number, number>()
    for (const m of matches) {
      appearances.set(m.team1Seed!, (appearances.get(m.team1Seed!) ?? 0) + 1)
      appearances.set(m.team2Seed!, (appearances.get(m.team2Seed!) ?? 0) + 1)
    }
    for (const count of appearances.values()) {
      expect(count).toBe(3)
    }
  })

  it("throws for less than 2 teams", () => {
    expect(() => generateRoundRobin(1)).toThrow()
  })
})

describe("generateBracket dispatch", () => {
  it("dispatches to round robin", () => {
    const rr = generateBracket("ROUND_ROBIN", 4)
    expect(rr.matches).toHaveLength(6)
  })
  it("defaults to single elimination", () => {
    const se = generateBracket("SINGLE_ELIMINATION", 4)
    expect(se.matches).toHaveLength(3)
  })
  it("dispatches to double elimination", () => {
    const de = generateBracket("DOUBLE_ELIMINATION", 4)
    expect(de.matches).toHaveLength(6)
  })
  it("falls back to single elim for unknown formats", () => {
    const se = generateBracket("UNKNOWN_FORMAT", 4)
    expect(se.matches).toHaveLength(3)
  })
})

describe("generateDoubleElimination", () => {
  it("4 teams: 6 matches (3 WB + 2 LB + 1 GF)", () => {
    const { matches } = generateDoubleElimination(4)
    const wb = matches.filter((m) => m.bracketSide === "WINNERS")
    const lb = matches.filter((m) => m.bracketSide === "LOSERS")
    const gf = matches.filter((m) => m.bracketSide === "GRAND_FINAL")
    expect(wb).toHaveLength(3)
    expect(lb).toHaveLength(2)
    expect(gf).toHaveLength(1)
  })

  it("8 teams: 14 matches (7 WB + 6 LB + 1 GF), guarantees 2K-2 total", () => {
    const { matches } = generateDoubleElimination(8)
    expect(matches).toHaveLength(14)
    expect(matches.filter((m) => m.bracketSide === "WINNERS")).toHaveLength(7)
    expect(matches.filter((m) => m.bracketSide === "LOSERS")).toHaveLength(6)
    expect(matches.filter((m) => m.bracketSide === "GRAND_FINAL")).toHaveLength(1)
  })

  it("16 teams: 30 matches", () => {
    const { matches } = generateDoubleElimination(16)
    expect(matches).toHaveLength(30)
  })

  it("LR1 matches both pull losers from WR1", () => {
    const { matches } = generateDoubleElimination(8)
    const lr1 = matches
      .filter((m) => m.bracketSide === "LOSERS")
      .sort((a, b) => a.position - b.position)
      .slice(0, 2)
    for (const m of lr1) {
      expect(m.fromMatch1IsLoser).toBe(true)
      expect(m.fromMatch2IsLoser).toBe(true)
    }
  })

  it("Grand final pulls WB final winner and LB final winner", () => {
    const { matches } = generateDoubleElimination(8)
    const gf = matches.find((m) => m.bracketSide === "GRAND_FINAL")!
    expect(gf.fromMatch1IsLoser).toBeFalsy()
    expect(gf.fromMatch2IsLoser).toBeFalsy()
  })

  it("rejects non-power-of-2 team counts", () => {
    expect(() => generateDoubleElimination(6)).toThrow(/power of 2/)
    expect(() => generateDoubleElimination(10)).toThrow(/power of 2/)
  })

  it("rejects fewer than 4 teams", () => {
    expect(() => generateDoubleElimination(2)).toThrow(/at least 4/)
  })
})

describe("advanceWinner with loser routing", () => {
  it("does not propagate winner to LB slots that pull losers", () => {
    const { matches } = generateDoubleElimination(4)
    // WR1 match position 1 — loser should fill an LB slot, not winner.
    const updated = advanceWinner(1, 1, matches)
    const lbSlot = updated.find(
      (m) => m.bracketSide === "LOSERS" && (m.fromMatch1Pos === 1 || m.fromMatch2Pos === 1)
    )
    expect(lbSlot).toBeDefined()
    // Neither slot should have been populated with the winner seed.
    expect(lbSlot?.team1Seed).toBeNull()
    expect(lbSlot?.team2Seed).toBeNull()
  })
})

describe("resolveByes", () => {
  // A synthetic round-1 match with a single team (the other slot null) is a bye.
  const byeFixture = (): BracketMatch[] => [
    { position: 1, round: 1, bracketSide: "WINNERS", team1Seed: 1, team2Seed: null },
    { position: 2, round: 1, bracketSide: "WINNERS", team1Seed: 2, team2Seed: 3 },
    {
      position: 3,
      round: 2,
      bracketSide: "WINNERS",
      team1Seed: null,
      team2Seed: null,
      fromMatch1Pos: 1,
      fromMatch2Pos: 2,
    },
  ]

  it("auto-advances a bye team into the next round", () => {
    const { matches: resolved, byeWinners } = resolveByes(byeFixture())
    expect(byeWinners.size).toBe(1)
    expect(byeWinners.get(1)).toBe(1)
    const fed = resolved.find((m) => m.position === 3)
    expect(fed?.team1Seed).toBe(1)
  })

  it("produces no bye winners for a full power-of-2 bracket", () => {
    const { matches } = generateSingleElimination(8)
    const { byeWinners } = resolveByes(matches)
    expect(byeWinners.size).toBe(0)
  })

  it("produces no bye winners for a play-in bracket (every team plays)", () => {
    const { matches } = generateSingleElimination(19)
    const { byeWinners } = resolveByes(matches)
    expect(byeWinners.size).toBe(0)
  })

  it("does not mutate the input matches", () => {
    const input = byeFixture()
    const before = JSON.stringify(input)
    resolveByes(input)
    expect(JSON.stringify(input)).toBe(before)
  })

  it("ignores losers-bracket matches in double elimination", () => {
    const { matches } = generateDoubleElimination(4)
    const { byeWinners } = resolveByes(matches)
    expect(byeWinners.size).toBe(0)
  })
})

describe("advanceWinner", () => {
  it("populates team1Seed of next-round match when fromMatch1Pos matches", () => {
    const { matches } = generateSingleElimination(4)
    const updated = advanceWinner(1, 1, matches)
    const nextRoundMatch = updated.find((m) => m.fromMatch1Pos === 1)
    expect(nextRoundMatch?.team1Seed).toBe(1)
  })

  it("populates team2Seed of next-round match when fromMatch2Pos matches", () => {
    const { matches } = generateSingleElimination(4)
    const updated = advanceWinner(2, 3, matches)
    const nextRoundMatch = updated.find((m) => m.fromMatch2Pos === 2)
    expect(nextRoundMatch?.team2Seed).toBe(3)
  })
})
