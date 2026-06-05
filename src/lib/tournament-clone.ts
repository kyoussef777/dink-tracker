import { db } from "@/lib/db"
import { resetBracket } from "@/lib/bracket-reset"

/**
 * Deep-copy a tournament into a fresh DRAFT owned by `userId`. Copies brackets,
 * teams, players (including their Clerk account links and registrations), and
 * regenerates each bracket's draw at round 1 — scores, winners, courts, and
 * match progress are intentionally NOT carried over, so the copy is ready to run
 * again from scratch. Returns the new tournament id, or null if the source is gone.
 *
 * Not wrapped in one transaction: each bracket's draw is rebuilt via resetBracket
 * (which opens its own transaction). A failure mid-clone leaves a partial draft
 * the admin can simply delete.
 */
export async function cloneTournament(sourceId: string, userId: string): Promise<string | null> {
  const source = await db.tournament.findUnique({
    where: { id: sourceId },
    include: {
      entries: true,
      brackets: {
        orderBy: { skillLevel: "asc" },
        include: {
          teams: {
            orderBy: [{ seed: "asc" }, { id: "asc" }],
            include: { players: true },
          },
        },
      },
    },
  })
  if (!source) return null

  const clone = await db.tournament.create({
    data: {
      name: `${source.name} (Copy)`,
      venue: source.venue,
      startDate: source.startDate,
      endDate: source.endDate,
      status: "DRAFT",
      description: source.description,
      courtNames: source.courtNames,
      createdBy: userId,
      entries: {
        create: source.entries.map((e) => ({ name: e.name, rating: e.rating, email: e.email })),
      },
    },
  })

  for (const b of source.brackets) {
    const bracket = await db.bracket.create({
      data: {
        tournamentId: clone.id,
        skillLevel: b.skillLevel,
        format: b.format,
        status: "PENDING",
        rounds: 0,
        maxActiveMatches: b.maxActiveMatches,
      },
    })

    if (b.teams.length === 0) continue

    // Recreate teams (re-seeded 1..N in source order) with their players.
    await db.$transaction(
      b.teams.map((team, i) =>
        db.team.create({
          data: {
            bracketId: bracket.id,
            name: team.name,
            seed: i + 1,
            players: {
              create: team.players.map((p) => ({
                name: p.name,
                rating: p.rating,
                email: p.email,
                phone: p.phone,
                userId: p.userId,
              })),
            },
          },
        })
      )
    )

    // Build a fresh round-1 draw. resetBracket no-ops on too few / invalid team
    // counts, leaving the bracket PENDING for the admin to fix up.
    await resetBracket(bracket.id)
  }

  return clone.id
}
