import { describe, it, expect } from "vitest"
import { computeStandings } from "./standings"
import type { Match, Team } from "@prisma/client"

function team(id: string, name: string): Team {
  return { id, name, seed: null, bracketId: "b" }
}

function match(
  id: string,
  team1Id: string,
  team2Id: string,
  score1: number[],
  score2: number[],
  winnerId: string | null,
  status: Match["status"] = "COMPLETED"
): Match & { team1: Team | null; team2: Team | null } {
  return {
    id,
    bracketId: "b",
    round: 1,
    position: 0,
    team1Id,
    team2Id,
    winnerId,
    score1,
    score2,
    court: null,
    status,
    bracketSide: "WINNERS",
    fromMatch1Pos: null,
    fromMatch2Pos: null,
    fromMatch1IsLoser: false,
    fromMatch2IsLoser: false,
    scheduledAt: null,
    completedAt: null,
    team1: null,
    team2: null,
  }
}

describe("computeStandings", () => {
  it("ranks by wins, then point differential", () => {
    const teams = [team("a", "Alpha"), team("b", "Bravo"), team("c", "Charlie")]
    const matches = [
      match("m1", "a", "b", [11, 11], [3, 5], "a"),
      match("m2", "a", "c", [11, 11], [9, 9], "a"),
      match("m3", "b", "c", [11, 11], [4, 4], "b"),
    ]
    const rows = computeStandings(teams, matches)
    expect(rows[0].team.id).toBe("a")
    expect(rows[0].wins).toBe(2)
    expect(rows[1].team.id).toBe("b")
    expect(rows[1].wins).toBe(1)
    expect(rows[2].team.id).toBe("c")
    expect(rows[2].wins).toBe(0)
  })

  it("computes point differential correctly", () => {
    const teams = [team("a", "A"), team("b", "B")]
    const matches = [match("m1", "a", "b", [11, 11], [7, 5], "a")]
    const rows = computeStandings(teams, matches)
    const a = rows.find((r) => r.team.id === "a")!
    const b = rows.find((r) => r.team.id === "b")!
    expect(a.pointsFor).toBe(22)
    expect(a.pointsAgainst).toBe(12)
    expect(a.pointDiff).toBe(10)
    expect(b.pointDiff).toBe(-10)
  })

  it("ignores incomplete matches", () => {
    const teams = [team("a", "A"), team("b", "B")]
    const matches = [match("m1", "a", "b", [5], [3], null, "IN_PROGRESS")]
    const rows = computeStandings(teams, matches)
    expect(rows[0].played).toBe(0)
    expect(rows[1].played).toBe(0)
  })

  it("assigns sequential ranks", () => {
    const teams = [team("a", "A"), team("b", "B"), team("c", "C")]
    const matches = [
      match("m1", "a", "b", [11], [9], "a"),
      match("m2", "b", "c", [11], [7], "b"),
    ]
    const rows = computeStandings(teams, matches)
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3])
  })
})
