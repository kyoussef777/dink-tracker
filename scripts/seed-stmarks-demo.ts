import { PrismaClient } from "@prisma/client"
import { createClerkClient } from "@clerk/backend"
import { generateBracket } from "../src/lib/bracket-engine"

const OWNER_EMAIL = "kamal.youssef60@gmail.com"

const TOURNAMENT = {
  name: "St. Mark's Pickleball Tournament — Demo",
  venue: "Pickleball HQ — 111 NJ-35, Cliffwood, NJ 07721",
  startDate: new Date("2026-06-07T18:30:00Z"),
  endDate: new Date("2026-06-08T00:00:00Z"),
  description:
    "Demo clone of the St. Mark's Pickleball Tournament — pre-populated with mock registrations for testing brackets and live scoring.",
  status: "REGISTRATION" as const,
}

type MockTeam = {
  player1: string
  player2: string
  phone: string
  email1?: string
  email2?: string
}

const BEGINNER_INTERMEDIATE: MockTeam[] = [
  { player1: "Maria Garcia", player2: "Luis Garcia", phone: "201-555-0110", email1: "maria.g@example.com" },
  { player1: "Aaron Patel", player2: "Priya Shah", phone: "201-555-0111", email1: "aaron.p@example.com" },
  { player1: "Jenna Wu", player2: "Kevin Tran", phone: "201-555-0112" },
  { player1: "Sam Reilly", player2: "Dana Reilly", phone: "201-555-0113", email1: "sam.r@example.com" },
  { player1: "Tom Becker", player2: "Lisa Becker", phone: "201-555-0114" },
  { player1: "Marcus Johnson", player2: "Tasha Johnson", phone: "201-555-0115" },
  { player1: "Ellie Park", player2: "Brian Cho", phone: "201-555-0116" },
  { player1: "Owen Murphy", player2: "Caitlin Walsh", phone: "201-555-0117" },
]

const INTERMEDIATE_ADVANCED: MockTeam[] = [
  { player1: "Kyrollos Zaki", player2: "Richie Sawires", phone: "201-978-2594", email1: "kyrollos@example.com" },
  { player1: "Alex Kim", player2: "Jamie Lee", phone: "201-555-0120", email1: "alex.k@example.com" },
  { player1: "Morgan Reed", player2: "Casey Wright", phone: "201-555-0121" },
  { player1: "Nick Russo", player2: "Vince Russo", phone: "201-555-0122" },
  { player1: "Devon Hayes", player2: "Riley Hayes", phone: "201-555-0123" },
  { player1: "Sophia Chen", player2: "Henry Chen", phone: "201-555-0124", email1: "sophia.c@example.com" },
]

function teamName(p1: string, p2: string): string {
  return `${p1.split(/\s+/)[0]} & ${p2.split(/\s+/)[0]}`
}

async function main() {
  const db = new PrismaClient()
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) throw new Error("CLERK_SECRET_KEY missing — check .env.local")

  const clerk = createClerkClient({ secretKey: secret })
  const { data: users } = await clerk.users.getUserList({ emailAddress: [OWNER_EMAIL], limit: 1 })
  const owner = users[0]
  if (!owner) {
    throw new Error(
      `No Clerk user with email ${OWNER_EMAIL}. Sign in to the app at least once before running this script.`
    )
  }

  // Idempotency: delete prior demo so re-runs always produce a fresh clone.
  const prior = await db.tournament.findFirst({
    where: { name: TOURNAMENT.name, createdBy: owner.id },
    select: { id: true },
  })
  if (prior) {
    await db.tournament.delete({ where: { id: prior.id } })
    console.log(`Removed prior demo: ${prior.id}`)
  }

  const tournament = await db.tournament.create({
    data: { ...TOURNAMENT, createdBy: owner.id },
  })
  console.log(`Created demo tournament: ${tournament.id}`)

  const groups: [string, MockTeam[]][] = [
    ["Beginner-Intermediate", BEGINNER_INTERMEDIATE],
    ["Intermediate-Advanced", INTERMEDIATE_ADVANCED],
  ]

  for (const [skillLevel, mocks] of groups) {
    const bracket = await db.bracket.create({
      data: { tournamentId: tournament.id, skillLevel, format: "SINGLE_ELIMINATION" },
    })

    const teams = await db.$transaction(
      mocks.map((m, i) =>
        db.team.create({
          data: {
            bracketId: bracket.id,
            name: teamName(m.player1, m.player2),
            seed: i + 1,
            players: {
              create: [
                { name: m.player1, phone: m.phone, ...(m.email1 ? { email: m.email1 } : {}) },
                { name: m.player2, ...(m.email2 ? { email: m.email2 } : {}) },
              ],
            },
          },
        })
      )
    )

    const generated = generateBracket(bracket.format, teams.length)
    const seedToTeamId = new Map(teams.map((t, i) => [i + 1, t.id]))

    await db.match.createMany({
      data: generated.matches.map((m) => ({
        bracketId: bracket.id,
        round: m.round,
        position: m.position,
        team1Id: m.team1Seed ? seedToTeamId.get(m.team1Seed) ?? null : null,
        team2Id: m.team2Seed ? seedToTeamId.get(m.team2Seed) ?? null : null,
        status:
          m.round === 1 && (m.team1Seed === null || m.team2Seed === null) ? "BYE" : "PENDING",
        fromMatch1Pos: m.fromMatch1Pos ?? null,
        fromMatch2Pos: m.fromMatch2Pos ?? null,
      })),
    })

    await db.bracket.update({
      where: { id: bracket.id },
      data: { rounds: generated.totalRounds, status: "ACTIVE" },
    })

    console.log(`  ${skillLevel}: ${teams.length} teams, ${generated.matches.length} matches`)
  }

  console.log(`\nOpen at: /tournaments/${tournament.id}`)
  await db.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
