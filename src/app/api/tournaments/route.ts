import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { getCurrentRole, requireAdmin } from "@/lib/auth"
import { TournamentCreateSchema } from "@/lib/validators"

export async function GET() {
  const current = await getCurrentRole()
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const where =
    current.role === "ADMIN"
      ? {}
      : { brackets: { some: { teams: { some: { players: { some: { userId: current.userId } } } } } } }

  const tournaments = await db.tournament.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: { _count: { select: { brackets: true } } },
  })

  return Response.json({ data: tournaments })
}

export async function POST(req: Request) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const data = await parseBody(req, TournamentCreateSchema)
  if (data instanceof Response) return data

  const tournament = await db.tournament.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      createdBy: userId,
    },
  })

  return Response.json({ data: tournament }, { status: 201 })
}
