import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { getCurrentRole, requireAdmin } from "@/lib/auth"
import { TournamentUpdateSchema } from "@/lib/validators"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const current = await getCurrentRole()
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const where =
    current.role === "ADMIN"
      ? { id }
      : {
          id,
          brackets: { some: { teams: { some: { players: { some: { userId: current.userId } } } } } },
        }
  const tournament = await db.tournament.findFirst({
    where,
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
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const data = await parseBody(req, TournamentUpdateSchema)
  if (data instanceof Response) return data

  const existing = await db.tournament.findFirst({ where: { id } })
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
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const existing = await db.tournament.findFirst({ where: { id } })
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

  await db.tournament.delete({ where: { id } })
  return Response.json({ data: { id } })
}
