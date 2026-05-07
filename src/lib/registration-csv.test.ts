import { describe, it, expect } from "vitest"
import { parseRegistrationsCsv, normalizeSkillLevel, groupBySkillLevel } from "./registration-csv"

describe("normalizeSkillLevel", () => {
  it("normalizes the form's two skill labels", () => {
    expect(normalizeSkillLevel("beginner-intermediate")).toBe("Beginner-Intermediate")
    expect(normalizeSkillLevel("Intermediate Advanced")).toBe("Intermediate-Advanced")
    expect(normalizeSkillLevel("INT-ADV")).toBe("Intermediate-Advanced")
  })

  it("preserves numeric ratings as-is", () => {
    expect(normalizeSkillLevel("4.5")).toBe("4.5")
    expect(normalizeSkillLevel("Open")).toBe("Open")
  })
})

describe("parseRegistrationsCsv", () => {
  it("parses required columns and groups by skill", () => {
    const csv = [
      "player1_name,player2_name,phone,skill_level",
      "Jane Doe,John Smith,201-555-0100,Beginner-Intermediate",
      "Sara Lee,Mike Park,,Beginner-Intermediate",
      "Alex Kim,Jamie Chen,,Intermediate-Advanced",
    ].join("\n")
    const { rows, errors } = parseRegistrationsCsv(csv)
    expect(errors).toEqual([])
    expect(rows).toHaveLength(3)
    expect(rows[0].player1Name).toBe("Jane Doe")
    expect(rows[0].player2Name).toBe("John Smith")
    expect(rows[0].phone).toBe("201-555-0100")
    expect(rows[0].teamName).toBe("Jane & John")

    const groups = groupBySkillLevel(rows)
    expect(groups.get("Beginner-Intermediate")).toHaveLength(2)
    expect(groups.get("Intermediate-Advanced")).toHaveLength(1)
  })

  it("reports missing required columns", () => {
    const { rows, errors } = parseRegistrationsCsv("player1_name,phone\nJane,201")
    expect(rows).toEqual([])
    expect(errors[0]).toMatch(/Missing required column/)
  })

  it("reports missing per-row required fields", () => {
    const csv = [
      "player1_name,player2_name,skill_level",
      ",Partner,Beginner-Intermediate",
      "Alex,,Intermediate-Advanced",
      "Sam,Pat,",
    ].join("\n")
    const { rows, errors } = parseRegistrationsCsv(csv)
    expect(rows).toHaveLength(0)
    expect(errors).toHaveLength(3)
    expect(errors[0]).toMatch(/Row 2.*player1_name/)
    expect(errors[1]).toMatch(/Row 3.*player2_name/)
    expect(errors[2]).toMatch(/Row 4.*skill_level/)
  })

  it("uses team_name override and falls back to email column when partner_email missing", () => {
    const csv = [
      "player1_name,player2_name,email,partner_email,skill_level,team_name",
      "Jane Doe,John Smith,jane@x.com,john@x.com,4.0,The Aces",
      "Sara Lee,Mike Park,sara@x.com,,4.5,",
    ].join("\n")
    const { rows } = parseRegistrationsCsv(csv)
    expect(rows[0].teamName).toBe("The Aces")
    expect(rows[0].player1Email).toBe("jane@x.com")
    expect(rows[0].player2Email).toBe("john@x.com")
    expect(rows[1].teamName).toBe("Sara & Mike")
    expect(rows[1].player2Email).toBeUndefined()
  })
})
