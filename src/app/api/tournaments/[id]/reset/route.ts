import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { resetBracket } from "@/lib/bracket-reset"
import { pusherServer } from "@/lib/pusher"

type Params = { params: Promise<{ id: string }> }

/**
 * Reset every bracket in a tournament back to its first round: all scores,
 * winners, and match progress are wiped and the draws are rebuilt from the
 * current teams. Teams and players are preserved. A COMPLETED tournament is
 * reopened to ACTIVE. Admin only.
 */
export async function POST(_req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const tournament = await db.tournament.findFirst({
    where: { id },
    select: { id: true, status: true, brackets: { select: { id: true } } },
  })
  if (!tournament) return Response.json({ error: "Not found" }, { status: 404 })

  let resetCount = 0
  for (const bracket of tournament.brackets) {
    const outcome = await resetBracket(bracket.id)
    if (outcome.status === "rebuilt") {
      resetCount++
      await pusherServer
        .trigger(`tournament-${id}`, "bracket-advanced", { bracketId: bracket.id })
        .catch(() => {})
    }
    // Brackets with too few teams (or an invalid draw) are simply left untouched.
  }

  // Reopen a finished tournament now that its results are cleared.
  if (tournament.status === "COMPLETED") {
    await db.tournament.update({ where: { id }, data: { status: "ACTIVE" } })
    await pusherServer.trigger(`tournament-${id}`, "tournament-status-changed", {}).catch(() => {})
  }

  return Response.json({ data: { bracketsReset: resetCount } })
}
