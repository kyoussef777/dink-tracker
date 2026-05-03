import { db } from "@/lib/db"
import { requireUser } from "@/lib/api"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const userId = await requireUser()
  if (userId instanceof Response) return userId

  const { id } = await params
  const bracket = await db.bracket.findFirst({
    where: { id, tournament: { createdBy: userId } },
    include: {
      tournament: { select: { id: true, name: true } },
      teams: { include: { players: true }, orderBy: { seed: "asc" } },
      matches: {
        include: { team1: true, team2: true, winner: true },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  })

  if (!bracket) return Response.json({ error: "Not found" }, { status: 404 })
  return Response.json({ data: bracket })
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireUser()
  if (userId instanceof Response) return userId

  const { id } = await params
  const existing = await db.bracket.findFirst({
    where: { id, tournament: { createdBy: userId } },
    select: { id: true },
  })
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

  await db.bracket.delete({ where: { id } })
  return Response.json({ data: { id } })
}
