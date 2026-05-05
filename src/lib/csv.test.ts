import { describe, it, expect } from "vitest"
import { parseCsv } from "./csv"

describe("parseCsv", () => {
  it("parses headers and rows", () => {
    const rows = parseCsv("name,email\nAlex,alex@x.com\nJamie,jamie@x.com")
    expect(rows).toEqual([
      { name: "Alex", email: "alex@x.com" },
      { name: "Jamie", email: "jamie@x.com" },
    ])
  })

  it("lowercases headers", () => {
    const rows = parseCsv("Name,EMAIL\nAlex,alex@x.com")
    expect(rows[0]).toEqual({ name: "Alex", email: "alex@x.com" })
  })

  it("handles quoted fields with commas", () => {
    const rows = parseCsv('team,note\n"Dinkers, Inc.","hi, there"')
    expect(rows[0]).toEqual({ team: "Dinkers, Inc.", note: "hi, there" })
  })

  it("handles escaped double quotes inside quoted fields", () => {
    const rows = parseCsv('name\n"Al ""ace"" Kim"')
    expect(rows[0].name).toBe('Al "ace" Kim')
  })

  it("handles CRLF line endings and skips empty rows", () => {
    const rows = parseCsv("name\r\nAlex\r\n\r\nJamie\r\n")
    expect(rows).toEqual([{ name: "Alex" }, { name: "Jamie" }])
  })

  it("strips UTF-8 BOM", () => {
    const rows = parseCsv("﻿name\nAlex")
    expect(rows[0]).toEqual({ name: "Alex" })
  })

  it("returns empty array for empty input", () => {
    expect(parseCsv("")).toEqual([])
  })
})
