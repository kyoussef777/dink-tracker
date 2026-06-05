import { requireAdmin } from "@/lib/auth"
import { cloneTournament } from "@/lib/tournament-clone"

type Params = { params: Promise<{ id: string }> }

/**
 * Duplicate a tournament — its brackets, teams, players, and registrations — into
 * a fresh DRAFT copy owned by the current admin. Draws are rebuilt at round 1
 * with no scores. Admin only.
 */
export async function POST(_req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const newId = await cloneTournament(id, userId)
  if (!newId) return Response.json({ error: "Not found" }, { status: 404 })

  return Response.json({ data: { id: newId } }, { status: 201 })
}
