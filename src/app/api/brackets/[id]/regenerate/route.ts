import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { resetBracket } from "@/lib/bracket-reset"
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
    where: { id },
    select: { id: true, tournamentId: true },
  })
  if (!bracket) return Response.json({ error: "Not found" }, { status: 404 })

  const outcome = await resetBracket(id)
  if (outcome.status === "too_few") {
    return Response.json({ error: "Need at least 2 teams to generate a bracket" }, { status: 400 })
  }
  if (outcome.status === "invalid") {
    return Response.json({ error: outcome.error }, { status: 400 })
  }

  await pusherServer
    .trigger(`tournament-${bracket.tournamentId}`, "bracket-advanced", { bracketId: id })
    .catch(() => {})

  return Response.json({ data: { matchCount: outcome.matchCount, rounds: outcome.rounds } })
}
