import { describe, it, expect } from "vitest"
import { generateSingleElimination, generateRoundRobin, advanceWinner, generateBracket } from "./bracket-engine"

describe("generateSingleElimination", () => {
  it("8 teams: 3 rounds, 7 matches, no byes", () => {
    const { matches, totalRounds, hasByes } = generateSingleElimination(8)
    expect(totalRounds).toBe(3)
    expect(matches).toHaveLength(7)
    expect(hasByes).toBe(false)
  })

  it("5 teams: 3 rounds, 7 matches, has byes", () => {
    const { matches, totalRounds, hasByes } = generateSingleElimination(5)
    expect(totalRounds).toBe(3)
    expect(matches).toHaveLength(7)
    expect(hasByes).toBe(true)
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
  it("falls back to single elim for unknown formats", () => {
    const se = generateBracket("DOUBLE_ELIMINATION", 4)
    expect(se.matches).toHaveLength(3)
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
