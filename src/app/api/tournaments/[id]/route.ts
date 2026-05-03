import { db } from "@/lib/db"
import { requireUser, parseBody } from "@/lib/api"
import { TournamentUpdateSchema } from "@/lib/validators"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const userId = await requireUser()
  if (userId instanceof Response) return userId

  const { id } = await params
  const tournament = await db.tournament.findFirst({
    where: { id, createdBy: userId },
    include: {
      brackets: {
        include: { teams: true, _count: { select: { matches: true } } },
        orderBy: { skillLevel: "asc" },
      },
    },
  })

  if (!tournament) return Response.json({ error: "Not found" }, { status: 404 })
  return Response.json({ data: tournament })
}

export async function PATCH(req: Request, { params }: Params) {
  const userId = await requireUser()
  if (userId instanceof Response) return userId

  const { id } = await params
  const data = await parseBody(req, TournamentUpdateSchema)
  if (data instanceof Response) return data

  const existing = await db.tournament.findFirst({ where: { id, createdBy: userId } })
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

  const tournament = await db.tournament.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  })

  return Response.json({ data: tournament })
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireUser()
  if (userId instanceof Response) return userId

  const { id } = await params
  const existing = await db.tournament.findFirst({ where: { id, createdBy: userId } })
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

  await db.tournament.delete({ where: { id } })
  return Response.json({ data: { id } })
}
