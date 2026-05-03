import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  const tournament = await db.tournament.upsert({
    where: { id: "clseed000000000000000000t1" },
    update: {},
    create: {
      id: "clseed000000000000000000t1",
      name: "Spring Open 2025",
      venue: "Dink City Recreation Center",
      startDate: new Date("2025-05-15"),
      endDate: new Date("2025-05-17"),
      status: "ACTIVE",
      description: "Annual spring open tournament. All skill levels welcome.",
      createdBy: "seed",
    },
  })

  const skillLevels: [string, string[]][] = [
    ["4.0", ["The Dinksters", "Net Ninjas", "Pickle Power", "Court Jesters"]],
    ["4.5", ["Ace Patrol", "Smash Bros", "The Dinkers", "Rally Cats"]],
  ]

  for (const [skillLevel, teamNames] of skillLevels) {
    const bracket = await db.bracket.create({
      data: {
        tournamentId: tournament.id,
        skillLevel,
        format: "SINGLE_ELIMINATION",
        status: "ACTIVE",
      },
    })

    for (const [i, name] of teamNames.entries()) {
      await db.team.create({
        data: {
          bracketId: bracket.id,
          name,
          seed: i + 1,
          players: {
            create: [
              { name: `${name} - Player 1`, rating: parseFloat(skillLevel) },
              { name: `${name} - Player 2`, rating: parseFloat(skillLevel) },
            ],
          },
        },
      })
    }
  }

  console.log("Seeded: 1 tournament, 2 brackets, 8 teams, 16 players")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
