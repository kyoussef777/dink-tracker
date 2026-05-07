import { PrismaClient } from "@prisma/client"
import { createClerkClient } from "@clerk/backend"

const OWNER_EMAIL = "kamal.youssef60@gmail.com"

const TOURNAMENT = {
  name: "St. Mark's 1st Annual Pickleball Tournament",
  venue: "Pickleball HQ — 111 NJ-35, Cliffwood, NJ 07721",
  startDate: new Date("2026-06-07T18:30:00Z"), // 2:30pm ET = 18:30 UTC
  endDate: new Date("2026-06-08T00:00:00Z"), // 8:00pm ET = 00:00 UTC next day
  description:
    "1st Annual St. Mark's Pickleball Tournament. Doubles only — bring your partner. Check-in 2:30 PM, games 3:00 PM SHARP. Cost: $35/player. Contact: Kyrollos Zaki (201) 978-2594, Richie Sawires (201) 779-9300.",
  status: "REGISTRATION" as const,
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

  const existing = await db.tournament.findFirst({
    where: { name: TOURNAMENT.name, createdBy: owner.id },
    select: { id: true },
  })

  let tournamentId: string
  if (existing) {
    const updated = await db.tournament.update({
      where: { id: existing.id },
      data: TOURNAMENT,
    })
    tournamentId = updated.id
    console.log(`Updated existing tournament: ${updated.id}`)
  } else {
    const created = await db.tournament.create({
      data: { ...TOURNAMENT, createdBy: owner.id },
    })
    tournamentId = created.id
    console.log(`Created tournament: ${created.id}`)
  }

  console.log(`\nOpen at: /tournaments/${tournamentId}`)
  console.log(`Owner: ${owner.primaryEmailAddress?.emailAddress} (${owner.id})`)
  await db.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
