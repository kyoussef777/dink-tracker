import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { z } from "zod"
import { generateSingleElimination, generateRoundRobin } from "@/lib/bracket-engine"

const AddTeamsSchema = z.object({
  teams: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        players: z
          .array(z.object({ name: z.string().min(1).max(100), rating: z.number().min(0).max(7).optional() }))
          .min(1)
          .max(4),
      })
    )
    .min(2),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const bracket = await db.bracket.findFirst({
    where: { id, tournament: { createdBy: userId } },
    include: { _count: { select: { teams: true } } },
  })
  if (!bracket) return Response.json({ error: "Not found" }, { status: 404 })
  if (bracket._count.teams > 0) {
    return Response.json({ error: "Teams already added. Delete bracket and recreate to change teams." }, { status: 400 })
  }

  const data = await parseBody(req, AddTeamsSchema)
  if (data instanceof Response) return data

  const created = await db.$transaction(
    data.teams.map((t, idx) =>
      db.team.create({
        data: {
          bracketId: id,
          name: t.name,
          seed: idx + 1,
          players: { create: t.players },
        },
      })
    )
  )

  const generated =
    bracket.format === "ROUND_ROBIN"
      ? generateRoundRobin(created.length)
      : generateSingleElimination(created.length)

  const seedToTeamId = new Map(created.map((t, i) => [i + 1, t.id]))

  await db.match.createMany({
    data: generated.matches.map((m) => ({
      bracketId: id,
      round: m.round,
      position: m.position,
      team1Id: m.team1Seed ? seedToTeamId.get(m.team1Seed) ?? null : null,
      team2Id: m.team2Seed ? seedToTeamId.get(m.team2Seed) ?? null : null,
      status:
        m.round === 1 && (m.team1Seed === null || m.team2Seed === null) ? "BYE" : "PENDING",
      fromMatch1Pos: m.fromMatch1Pos ?? null,
      fromMatch2Pos: m.fromMatch2Pos ?? null,
    })),
  })

  await db.bracket.update({
    where: { id },
    data: { rounds: generated.totalRounds, status: "ACTIVE" },
  })

  return Response.json({ data: { teamCount: created.length, matchCount: generated.matches.length } }, { status: 201 })
}
