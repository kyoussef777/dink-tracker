import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { TeamUpdateSchema } from "@/lib/validators"
import { pusherServer } from "@/lib/pusher"

type Params = { params: Promise<{ id: string; teamId: string }> }

/** Edit a team in a bracket: rename, reseed, or replace its players. Admin only. */
export async function PATCH(req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id: bracketId, teamId } = await params
  const data = await parseBody(req, TeamUpdateSchema)
  if (data instanceof Response) return data

  const team = await db.team.findFirst({
    where: { id: teamId, bracketId, bracket: { tournament: { createdBy: userId } } },
    include: { bracket: { select: { tournamentId: true } } },
  })
  if (!team) return Response.json({ error: "Not found" }, { status: 404 })

  const updated = await db.$transaction(async (tx) => {
    if (data.players) {
      await tx.player.deleteMany({ where: { teamId } })
      await tx.player.createMany({
        data: data.players.map((p) => ({
          teamId,
          name: p.name,
          rating: p.rating ?? null,
          email: p.email ? p.email : null,
          phone: p.phone ? p.phone : null,
        })),
      })
    }
    return tx.team.update({
      where: { id: teamId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.seed !== undefined ? { seed: data.seed } : {}),
      },
      include: { players: true },
    })
  })

  await pusherServer
    .trigger(`tournament-${team.bracket.tournamentId}`, "bracket-advanced", { bracketId })
    .catch(() => {})

  return Response.json({ data: updated })
}

/**
 * Remove a team from a bracket. The team is detached from any matches first
 * (slots and any win it recorded are cleared) so deletion can't orphan a match.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id: bracketId, teamId } = await params
  const team = await db.team.findFirst({
    where: { id: teamId, bracketId, bracket: { tournament: { createdBy: userId } } },
    include: { bracket: { select: { tournamentId: true } } },
  })
  if (!team) return Response.json({ error: "Not found" }, { status: 404 })

  await db.$transaction([
    db.match.updateMany({ where: { bracketId, team1Id: teamId }, data: { team1Id: null } }),
    db.match.updateMany({ where: { bracketId, team2Id: teamId }, data: { team2Id: null } }),
    db.match.updateMany({ where: { bracketId, winnerId: teamId }, data: { winnerId: null } }),
    db.team.delete({ where: { id: teamId } }),
  ])

  await pusherServer
    .trigger(`tournament-${team.bracket.tournamentId}`, "bracket-advanced", { bracketId })
    .catch(() => {})

  return Response.json({ data: { id: teamId } })
}
