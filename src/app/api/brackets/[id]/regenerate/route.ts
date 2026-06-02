import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { generateBracket, buildMatchRows } from "@/lib/bracket-engine"
import { pusherServer } from "@/lib/pusher"

type Params = { params: Promise<{ id: string }> }

/**
 * Rebuild a bracket's matches from its current teams, discarding all existing
 * matches and scores. Teams are re-seeded by their current `seed` (falling back
 * to insertion order). Admin only. Useful after adding/removing/reseeding teams.
 */
export async function POST(_req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const bracket = await db.bracket.findFirst({
    where: { id, tournament: { createdBy: userId } },
    include: {
      tournament: { select: { id: true } },
      teams: { orderBy: [{ seed: "asc" }, { id: "asc" }] },
    },
  })
  if (!bracket) return Response.json({ error: "Not found" }, { status: 404 })

  if (bracket.teams.length < 2) {
    return Response.json({ error: "Need at least 2 teams to generate a bracket" }, { status: 400 })
  }
  if (bracket.format === "DOUBLE_ELIMINATION") {
    const n = bracket.teams.length
    if (n < 4 || (n & (n - 1)) !== 0 || n > 32) {
      return Response.json(
        { error: "Double elimination needs a power-of-2 team count (4, 8, 16, or 32)." },
        { status: 400 }
      )
    }
  }

  const generated = generateBracket(bracket.format, bracket.teams.length)
  // Normalize seeds to 1..N in current order so the engine's seed map lines up.
  const seedToTeamId = new Map(bracket.teams.map((t, i) => [i + 1, t.id]))

  await db.$transaction([
    db.match.deleteMany({ where: { bracketId: id } }),
    ...bracket.teams.map((t, i) =>
      db.team.update({ where: { id: t.id }, data: { seed: i + 1 } })
    ),
    db.match.createMany({ data: buildMatchRows(generated, id, seedToTeamId) }),
    db.bracket.update({
      where: { id },
      data: { rounds: generated.totalRounds, status: "ACTIVE" },
    }),
  ])

  await pusherServer
    .trigger(`tournament-${bracket.tournament.id}`, "bracket-advanced", { bracketId: id })
    .catch(() => {})

  return Response.json({ data: { matchCount: generated.matches.length, rounds: generated.totalRounds } })
}
