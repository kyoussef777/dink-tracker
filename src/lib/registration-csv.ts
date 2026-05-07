import { parseCsv } from "@/lib/csv"

export type RegistrationRow = {
  player1Name: string
  player2Name: string
  player1Email?: string
  player2Email?: string
  phone?: string
  skillLevel: string
  teamName?: string
}

const REQUIRED = ["player1_name", "player2_name", "skill_level"] as const

const SKILL_ALIASES: Record<string, string> = {
  "beginner-intermediate": "Beginner-Intermediate",
  "beginner - intermediate": "Beginner-Intermediate",
  "beginner intermediate": "Beginner-Intermediate",
  "beg-int": "Beginner-Intermediate",
  "intermediate-advanced": "Intermediate-Advanced",
  "intermediate - advanced": "Intermediate-Advanced",
  "intermediate advanced": "Intermediate-Advanced",
  "int-adv": "Intermediate-Advanced",
}

export function normalizeSkillLevel(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  const key = trimmed.toLowerCase().replace(/\s+/g, " ")
  return SKILL_ALIASES[key] ?? trimmed
}

export type ParsedRegistrations = {
  rows: RegistrationRow[]
  errors: string[]
}

export function parseRegistrationsCsv(text: string): ParsedRegistrations {
  const records = parseCsv(text)
  const errors: string[] = []
  if (records.length === 0) return { rows: [], errors: ["CSV is empty"] }

  const headers = Object.keys(records[0])
  const missing = REQUIRED.filter((h) => !headers.includes(h))
  if (missing.length > 0) {
    return { rows: [], errors: [`Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`] }
  }

  const rows: RegistrationRow[] = []
  records.forEach((r, i) => {
    const lineNo = i + 2
    const p1 = r.player1_name?.trim()
    const p2 = r.player2_name?.trim()
    const skill = normalizeSkillLevel(r.skill_level ?? "")
    if (!p1) errors.push(`Row ${lineNo}: missing player1_name`)
    if (!p2) errors.push(`Row ${lineNo}: missing player2_name (partner)`)
    if (!skill) errors.push(`Row ${lineNo}: missing skill_level`)
    if (!p1 || !p2 || !skill) return

    const teamName = r.team_name?.trim() || defaultTeamName(p1, p2)
    rows.push({
      player1Name: p1,
      player2Name: p2,
      player1Email: r.player1_email?.trim() || r.email?.trim() || undefined,
      player2Email: r.player2_email?.trim() || r.partner_email?.trim() || undefined,
      phone: r.phone?.trim() || undefined,
      skillLevel: skill,
      teamName,
    })
  })

  return { rows, errors }
}

function defaultTeamName(p1: string, p2: string): string {
  const first = (n: string) => n.trim().split(/\s+/)[0] ?? n
  return `${first(p1)} & ${first(p2)}`
}

export function groupBySkillLevel(rows: RegistrationRow[]): Map<string, RegistrationRow[]> {
  const map = new Map<string, RegistrationRow[]>()
  for (const r of rows) {
    const list = map.get(r.skillLevel) ?? []
    list.push(r)
    map.set(r.skillLevel, list)
  }
  return map
}
