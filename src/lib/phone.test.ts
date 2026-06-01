import { describe, it, expect } from "vitest"
import { normalizePhone } from "./phone"

describe("normalizePhone", () => {
  it("adds +1 to a bare 10-digit US number", () => {
    expect(normalizePhone("5551234567")).toBe("+15551234567")
  })

  it("strips formatting from a 10-digit number", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("+15551234567")
  })

  it("handles a leading 1 without a plus", () => {
    expect(normalizePhone("1 555 123 4567")).toBe("+15551234567")
  })

  it("preserves an existing E.164 number", () => {
    expect(normalizePhone("+447911123456")).toBe("+447911123456")
  })

  it("strips formatting inside an international number", () => {
    expect(normalizePhone("+44 (791) 112-3456")).toBe("+447911123456")
  })

  it("returns null for null/undefined/empty", () => {
    expect(normalizePhone(null)).toBeNull()
    expect(normalizePhone(undefined)).toBeNull()
    expect(normalizePhone("")).toBeNull()
    expect(normalizePhone("   ")).toBeNull()
  })

  it("returns null for too-short or junk input", () => {
    expect(normalizePhone("12345")).toBeNull()
    expect(normalizePhone("not a phone")).toBeNull()
  })
})
