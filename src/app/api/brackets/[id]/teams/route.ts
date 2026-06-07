import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { AddBracketTeamsSchema } from "@/lib/validators"
import { generateBracket, buildMatchRows } from "@/lib/bracket-engine"
import { autoLinkPlayersByEmail } from "@/lib/player-link"
import { pusherServer } from "@/lib/pusher"
import { clerkClient } from "@clerk/nextjs/server"

/** Double elimination requires a power-of-2 team count between 4 and 32. */
function isValidDoubleElimCount(n: number) {
  return n >= 4 && n <= 32 && (n & (n - 1)) === 0
}

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const bracket = await db.bracket.findFirst({
    where: { id },
    include: { _count: { select: { teams: true } } },
  })
  if (!bracket) return Response.json({ error: "Not found" }, { status: 404 })

  const data = await parseBody(req, AddBracketTeamsSchema)
  if (data instanceof Response) return data

  const existingCount = bracket._count.teams

  // Additive mode: a bracket that already has teams just gets more teams added
  // (seeded after the current ones); the admin regenerates the bracket to
  // rebuild matches. Initial mode generates matches immediately.
  if (existingCount > 0) {
    // Reject additions that would leave a double-elim bracket unregenerable —
    // otherwise the team is saved but the promised regenerate would 400.
    if (bracket.format === "DOUBLE_ELIMINATION" && !isValidDoubleElimCount(existingCount + data.teams.length)) {
      return Response.json(
        { error: "Double elimination needs a power-of-2 team count (4, 8, 16, or 32). Adjust how many teams you add." },
        { status: 400 }
      )
    }

    // Seed after the current highest seed (not the count) so a prior deletion
    // can't make a new team collide with an existing seed number.
    const { _max } = await db.team.aggregate({ where: { bracketId: id }, _max: { seed: true } })
    const base = _max.seed ?? existingCount
    const created = await db.$transaction(
      data.teams.map((t, idx) =>
        db.team.create({
          data: {
            bracketId: id,
            name: t.name,
            seed: base + idx + 1,
            players: { create: t.players },
          },
        })
      )
    )
    await linkPlayersByEmail(data.teams.flatMap((t) => t.players.map((p) => p.email).filter(Boolean) as string[]))
    await pusherServer.trigger(`tournament-${bracket.tournamentId}`, "bracket-advanced", { bracketId: id }).catch(() => {})
    return Response.json(
      { data: { teamCount: existingCount + created.length, added: created.length, regenerate: true } },
      { status: 201 }
    )
  }

  // Initial generation needs a real draw, so at least 2 teams.
  if (data.teams.length < 2) {
    return Response.json({ error: "At least 2 teams are required to generate a bracket." }, { status: 400 })
  }

  if (bracket.format === "DOUBLE_ELIMINATION" && !isValidDoubleElimCount(data.teams.length)) {
    return Response.json(
      { error: "Double elimination needs a power-of-2 team count (4, 8, 16, or 32)." },
      { status: 400 }
    )
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

  await db.match.createMany({ data: buildMatchRows(generated, id, seedToTeamId) })

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
