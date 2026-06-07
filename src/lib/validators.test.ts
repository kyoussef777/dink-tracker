import { describe, it, expect } from "vitest"
import { AddBracketTeamsSchema } from "./validators"

describe("AddBracketTeamsSchema", () => {
  const team = (name: string) => ({ name, players: [{ name: "Alex" }] })

  it("accepts a single team (additive add)", () => {
    const result = AddBracketTeamsSchema.safeParse({ teams: [team("Solo")] })
    expect(result.success).toBe(true)
  })

  it("accepts many teams", () => {
    const result = AddBracketTeamsSchema.safeParse({
      teams: [team("A"), team("B"), team("C")],
    })
    expect(result.success).toBe(true)
  })

  it("rejects an empty team list", () => {
    const result = AddBracketTeamsSchema.safeParse({ teams: [] })
    expect(result.success).toBe(false)
  })

  it("rejects a team with no players", () => {
    const result = AddBracketTeamsSchema.safeParse({ teams: [{ name: "Empty", players: [] }] })
    expect(result.success).toBe(false)
  })

  it("rejects a team with more than 4 players", () => {
    const players = Array.from({ length: 5 }, (_, i) => ({ name: `P${i}` }))
    const result = AddBracketTeamsSchema.safeParse({ teams: [{ name: "Crowd", players }] })
    expect(result.success).toBe(false)
  })

  it("accepts optional player email and phone", () => {
    const result = AddBracketTeamsSchema.safeParse({
      teams: [{ name: "Pros", players: [{ name: "Alex", email: "alex@example.com", phone: "555-1234" }] }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid email", () => {
    const result = AddBracketTeamsSchema.safeParse({
      teams: [{ name: "Bad", players: [{ name: "Alex", email: "not-an-email" }] }],
    })
    expect(result.success).toBe(false)
  })
})
