import { db } from "@/lib/db"
import { requireUser, parseBody } from "@/lib/api"
import { TournamentCreateSchema } from "@/lib/validators"

export async function GET() {
  const userId = await requireUser()
  if (userId instanceof Response) return userId

  const tournaments = await db.tournament.findMany({
    where: { createdBy: userId },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { brackets: true } } },
  })

  return Response.json({ data: tournaments })
}

export async function POST(req: Request) {
  const userId = await requireUser()
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
