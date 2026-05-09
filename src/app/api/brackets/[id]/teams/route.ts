import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { z } from "zod"
import { generateBracket } from "@/lib/bracket-engine"
import { autoLinkPlayersByEmail } from "@/lib/player-link"
import { clerkClient } from "@clerk/nextjs/server"

const AddTeamsSchema = z.object({
  teams: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        players: z
          .array(
            z.object({
              name: z.string().min(1).max(100),
              email: z.string().email().optional(),
              rating: z.number().min(0).max(7).optional(),
            })
          )
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

  if (bracket.format === "DOUBLE_ELIMINATION") {
    const n = data.teams.length
    if (n < 4 || (n & (n - 1)) !== 0 || n > 32) {
      return Response.json(
        { error: "Double elimination needs a power-of-2 team count (4, 8, 16, or 32)." },
        { status: 400 }
      )
    }
  }

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

  const generated = generateBracket(bracket.format, created.length)

  const seedToTeamId = new Map(created.map((t, i) => [i + 1, t.id]))

  await db.match.createMany({
    data: generated.matches.map((m) => ({
      bracketId: id,
      round: m.round,
      position: m.position,
      team1Id: m.team1Seed ? seedToTeamId.get(m.team1Seed) ?? null : null,
      team2Id: m.team2Seed ? seedToTeamId.get(m.team2Seed) ?? null : null,
      status:
        m.round === 1 && m.bracketSide !== "LOSERS" && (m.team1Seed === null || m.team2Seed === null)
          ? "BYE"
          : "PENDING",
      bracketSide: m.bracketSide ?? "WINNERS",
      fromMatch1Pos: m.fromMatch1Pos ?? null,
      fromMatch2Pos: m.fromMatch2Pos ?? null,
      fromMatch1IsLoser: m.fromMatch1IsLoser ?? false,
      fromMatch2IsLoser: m.fromMatch2IsLoser ?? false,
    })),
  })

  await db.bracket.update({
    where: { id },
    data: { rounds: generated.totalRounds, status: "ACTIVE" },
  })

  await linkPlayersByEmail(data.teams.flatMap((t) => t.players.map((p) => p.email).filter(Boolean) as string[]))

  return Response.json({ data: { teamCount: created.length, matchCount: generated.matches.length } }, { status: 201 })
}

async function linkPlayersByEmail(emails: string[]) {
  if (emails.length === 0) return
  const unique = Array.from(new Set(emails.map((e) => e.toLowerCase())))
  const client = await clerkClient()
  await Promise.all(
    unique.map(async (email) => {
      try {
        const { data } = await client.users.getUserList({ emailAddress: [email], limit: 1 })
        const user = data[0]
        if (user) await autoLinkPlayersByEmail(user.id, email)
      } catch {
        // ignore lookup errors; webhook will pick up linkage on next sign-in
      }
    })
  )
}
