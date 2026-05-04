import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { BracketCreateSchema } from "@/lib/validators"

export async function POST(req: Request) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const data = await parseBody(req, BracketCreateSchema)
  if (data instanceof Response) return data

  const tournament = await db.tournament.findFirst({
    where: { id: data.tournamentId, createdBy: userId },
    select: { id: true },
  })
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 })

  const bracket = await db.bracket.create({
    data: {
      tournamentId: data.tournamentId,
      skillLevel: data.skillLevel,
      format: data.format,
    },
  })

  return Response.json({ data: bracket }, { status: 201 })
}
