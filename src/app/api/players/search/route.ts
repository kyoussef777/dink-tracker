import { db } from "@/lib/db"
import { getCurrentRole } from "@/lib/auth"
import { PlayerSearchSchema } from "@/lib/validators"

export async function GET(req: Request) {
  const current = await getCurrentRole()
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const parsed = PlayerSearchSchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    tournamentId: url.searchParams.get("tournamentId") ?? undefined,
  })
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors.map((e) => e.message).join(", ") }, { status: 400 })
  }
  const { q, tournamentId } = parsed.data

  const tournamentScope =
    current.role === "ADMIN"
      ? {}
      : { teams: { some: { players: { some: { userId: current.userId } } } } }

  const players = await db.player.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
      team: {
        bracket: {
          ...(tournamentId ? { tournamentId } : {}),
          ...tournamentScope,
        },
      },
    },
    take: 20,
    include: {
      team: {
        select: {
          id: true,
          name: true,
          bracket: {
            select: {
              id: true,
              skillLevel: true,
              tournament: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return Response.json({ data: players })
}
