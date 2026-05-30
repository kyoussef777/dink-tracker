import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { z } from "zod"
import { generateBracket, buildMatchRows } from "@/lib/bracket-engine"
import { autoLinkPlayersByEmail } from "@/lib/player-link"
import { clerkClient } from "@clerk/nextjs/server"

const RegistrationSchema = z.object({
  player1Name: z.string().min(1).max(100),
  player2Name: z.string().min(1).max(100),
  player1Email: z.string().email().optional(),
  player2Email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  skillLevel: z.string().min(1).max(40),
  teamName: z.string().min(1).max(100).optional(),
})

const BodySchema = z.object({
  rows: z.array(RegistrationSchema).min(2),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const tournament = await db.tournament.findFirst({
    where: { id, createdBy: userId },
    include: { brackets: { include: { _count: { select: { teams: true } } } } },
  })
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors.map((e) => e.message).join(", ") }, { status: 400 })
  }

  const groups = new Map<string, z.infer<typeof RegistrationSchema>[]>()
  for (const r of parsed.data.rows) {
    const list = groups.get(r.skillLevel) ?? []
    list.push(r)
    groups.set(r.skillLevel, list)
  }

  for (const [skill, rows] of groups) {
    if (rows.length < 2) {
      return Response.json(
        { error: `Skill level "${skill}" only has ${rows.length} team — need at least 2.` },
        { status: 400 }
      )
    }
    const existing = tournament.brackets.find((b) => b.skillLevel === skill)
    if (existing && existing._count.teams > 0) {
      return Response.json(
        { error: `Bracket "${skill}" already has teams. Delete it before re-importing.` },
        { status: 400 }
      )
    }
  }

  const summary: { skillLevel: string; teamCount: number; matchCount: number }[] = []
  const allEmails: string[] = []

  for (const [skill, rows] of groups) {
    let bracket = tournament.brackets.find((b) => b.skillLevel === skill)
    if (!bracket) {
      const created = await db.bracket.create({
        data: { tournamentId: id, skillLevel: skill, format: "SINGLE_ELIMINATION" },
      })
      bracket = { ...created, _count: { teams: 0 } }
    }

    const teams = await db.$transaction(
      rows.map((r, idx) =>
        db.team.create({
          data: {
            bracketId: bracket!.id,
            name: r.teamName ?? `${r.player1Name.split(/\s+/)[0]} & ${r.player2Name.split(/\s+/)[0]}`,
            seed: idx + 1,
            players: {
              create: [
                {
                  name: r.player1Name,
                  ...(r.player1Email ? { email: r.player1Email } : {}),
                  ...(r.phone ? { phone: r.phone } : {}),
                },
                {
                  name: r.player2Name,
                  ...(r.player2Email ? { email: r.player2Email } : {}),
                },
              ],
            },
          },
        })
      )
    )

    const generated = generateBracket(bracket.format, teams.length)
    const seedToTeamId = new Map(teams.map((t, i) => [i + 1, t.id]))

    await db.match.createMany({ data: buildMatchRows(generated, bracket.id, seedToTeamId) })

    await db.bracket.update({
      where: { id: bracket.id },
      data: { rounds: generated.totalRounds, status: "ACTIVE" },
    })

    rows.forEach((r) => {
      if (r.player1Email) allEmails.push(r.player1Email)
      if (r.player2Email) allEmails.push(r.player2Email)
    })

    summary.push({ skillLevel: skill, teamCount: teams.length, matchCount: generated.matches.length })
  }

  await linkPlayersByEmail(allEmails)

  return Response.json(
    { data: { brackets: summary, totalTeams: parsed.data.rows.length } },
    { status: 201 }
  )
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
        // ignore lookup errors
      }
    })
  )
}
