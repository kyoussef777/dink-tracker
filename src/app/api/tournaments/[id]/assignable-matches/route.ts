import { db } from "@/lib/db"
import { requireUser } from "@/lib/api"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const userId = await requireUser()
  if (userId instanceof Response) return userId

  const { id } = await params
  const tournament = await db.tournament.findFirst({
    where: { id, createdBy: userId },
    select: { id: true },
  })
  if (!tournament) return Response.json({ error: "Not found" }, { status: 404 })

  const matches = await db.match.findMany({
    where: {
      bracket: { tournamentId: id },
      status: { in: ["PENDING", "IN_PROGRESS"] },
      team1Id: { not: null },
      team2Id: { not: null },
    },
    include: {
      team1: { select: { id: true, name: true } },
      team2: { select: { id: true, name: true } },
      bracket: { select: { id: true, skillLevel: true } },
    },
    orderBy: [{ status: "desc" }, { round: "asc" }, { position: "asc" }],
  })

  return Response.json({ data: matches })
}
